"""
Incident Detection Engine
Rule-based + AI anomaly detection for logs and system events.
Detects: failed deployments, memory spikes, CPU overload, downtime,
         auth failures, traffic spikes, database errors.
"""

import re
import logging
from datetime import datetime, timedelta
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from app.models import LogEntry, Incident, LogLevel, IncidentType, IncidentSeverity, LogSource

logger = logging.getLogger(__name__)


# ─── Detection Rules ──────────────────────────────────────────────────────────

DETECTION_RULES = [
    {
        "type": IncidentType.failed_deployment,
        "patterns": [
            r"deployment.*failed", r"deploy.*error", r"rollback.*triggered",
            r"CrashLoopBackOff", r"ImagePullBackOff", r"OOMKilled",
            r"exit code [1-9]", r"container.*exited", r"pod.*failed",
        ],
        "severity": IncidentSeverity.high,
        "confidence": 0.88,
        "title_template": "Failed Deployment Detected",
    },
    {
        "type": IncidentType.memory_spike,
        "patterns": [
            r"out of memory", r"OOM killer", r"memory.*exceeded",
            r"heap.*overflow", r"memory.*limit", r"MemoryError",
            r"Cannot allocate memory", r"killed process",
        ],
        "severity": IncidentSeverity.high,
        "confidence": 0.91,
        "title_template": "Memory Spike / OOM Event",
    },
    {
        "type": IncidentType.cpu_overload,
        "patterns": [
            r"cpu.*\b(9[0-9]|100)%", r"load average.*[5-9][0-9]\.",
            r"cpu throttl", r"performance.*degraded", r"high.*cpu.*usage",
            r"cpu usage.*critical",
        ],
        "severity": IncidentSeverity.high,
        "confidence": 0.85,
        "title_template": "CPU Overload Detected",
    },
    {
        "type": IncidentType.service_downtime,
        "patterns": [
            r"connection refused", r"service.*unavailable", r"503",
            r"timeout.*exceeded", r"health check.*failed", r"no route to host",
            r"ECONNREFUSED", r"upstream.*down", r"circuit breaker.*open",
        ],
        "severity": IncidentSeverity.critical,
        "confidence": 0.93,
        "title_template": "Service Downtime Detected",
    },
    {
        "type": IncidentType.auth_failure,
        "patterns": [
            r"authentication.*failed", r"invalid.*credentials",
            r"unauthorized.*access", r"401", r"403",
            r"login.*failed", r"password.*incorrect",
            r"too many.*failed.*attempts", r"account.*locked",
            r"brute.?force", r"suspicious.*login",
        ],
        "severity": IncidentSeverity.medium,
        "confidence": 0.87,
        "title_template": "Authentication Failures Detected",
    },
    {
        "type": IncidentType.traffic_spike,
        "patterns": [
            r"rate limit.*exceeded", r"too many requests", r"429",
            r"ddos", r"flood.*attack", r"spike.*traffic",
            r"abnormal.*requests", r"bandwidth.*exceeded",
        ],
        "severity": IncidentSeverity.high,
        "confidence": 0.82,
        "title_template": "Suspicious Traffic Spike",
    },
    {
        "type": IncidentType.database_error,
        "patterns": [
            r"database.*error", r"connection pool.*exhausted",
            r"query.*timeout", r"deadlock.*detected",
            r"replication.*lag", r"disk.*full",
            r"too many connections", r"max_connections",
        ],
        "severity": IncidentSeverity.critical,
        "confidence": 0.89,
        "title_template": "Database Error Detected",
    },
    {
        "type": IncidentType.disk_full,
        "patterns": [
            r"no space left", r"disk.*full", r"filesystem.*100%",
            r"write.*failed.*no space", r"storage.*exhausted",
        ],
        "severity": IncidentSeverity.critical,
        "confidence": 0.95,
        "title_template": "Disk Full / Storage Exhausted",
    },
]


# ─── Rule-Based Detector ──────────────────────────────────────────────────────

class IncidentDetector:
    """
    Rule-based incident detection engine.
    Scans log messages against known patterns and groups related events.
    """

    def __init__(self, db: Session):
        self.db = db
        self._compiled_rules = self._compile_rules()

    def _compile_rules(self):
        """Pre-compile regex patterns for performance."""
        compiled = []
        for rule in DETECTION_RULES:
            patterns = [re.compile(p, re.IGNORECASE) for p in rule["patterns"]]
            compiled.append({**rule, "compiled_patterns": patterns})
        return compiled

    def match_rule(self, message: str) -> Optional[Dict]:
        """Find the best matching rule for a log message."""
        for rule in self._compiled_rules:
            for pattern in rule["compiled_patterns"]:
                if pattern.search(message):
                    return rule
        return None

    def detect_from_logs(self, logs: List[LogEntry]) -> List[Incident]:
        """
        Process a list of log entries and create/update incidents.
        Groups related log events into single incidents.
        """
        detected = []
        grouped: Dict[IncidentType, List[LogEntry]] = {}

        for log in logs:
            if log.level in (LogLevel.ERROR, LogLevel.CRITICAL, LogLevel.WARNING):
                rule = self.match_rule(log.message)
                if rule:
                    incident_type = rule["type"]
                    if incident_type not in grouped:
                        grouped[incident_type] = []
                    grouped[incident_type].append((log, rule))

        for incident_type, log_rule_pairs in grouped.items():
            # Check if a recent open incident of this type exists
            recent = self.db.query(Incident).filter(
                Incident.incident_type == incident_type,
                Incident.status.in_(["open", "investigating"]),
                Incident.detected_at >= datetime.utcnow() - timedelta(hours=1),
            ).first()

            if recent:
                # Associate logs with existing incident
                for log, _ in log_rule_pairs:
                    if not log.incident_id:
                        log.incident_id = recent.id
                self.db.commit()
                continue

            # Get the rule with highest frequency in this group
            rule = log_rule_pairs[0][1]
            logs_only = [pair[0] for pair in log_rule_pairs]

            services = list(set(
                l.service_name for l in logs_only if l.service_name
            ))
            hosts = list(set(l.host for l in logs_only if l.host))

            incident = Incident(
                title=f"{rule['title_template']} - {', '.join(services) or 'Unknown Service'}",
                incident_type=incident_type,
                severity=rule["severity"],
                confidence_score=rule["confidence"],
                impacted_services=services,
                affected_hosts=hosts,
                detection_method="rule_based",
                tags=[incident_type.value, "auto_detected"],
                severity_score=self._calculate_severity_score(rule["severity"], len(logs_only)),
                timeline_events=[
                    {
                        "time": str(l.timestamp),
                        "event": l.message[:200],
                        "level": l.level,
                        "service": l.service_name,
                    }
                    for l in logs_only[:20]
                ],
            )
            self.db.add(incident)
            self.db.flush()  # Get ID

            # Link logs to incident
            for log in logs_only:
                log.incident_id = incident.id

            self.db.commit()
            self.db.refresh(incident)
            detected.append(incident)
            logger.info(f"🚨 Incident detected: {incident.title} (ID: {incident.id})")

        return detected

    def _calculate_severity_score(self, severity: IncidentSeverity, log_count: int) -> float:
        """Calculate a numeric severity score 0-10."""
        base = {"low": 2, "medium": 4, "high": 7, "critical": 9}[severity.value]
        count_bonus = min(log_count * 0.1, 1.0)
        return min(base + count_bonus, 10.0)

    def scan_recent_logs(self, minutes: int = 5) -> List[Incident]:
        """Scan logs from the last N minutes for new incidents."""
        cutoff = datetime.utcnow() - timedelta(minutes=minutes)
        recent_logs = (
            self.db.query(LogEntry)
            .filter(
                LogEntry.timestamp >= cutoff,
                LogEntry.incident_id.is_(None),
                LogEntry.level.in_([LogLevel.ERROR, LogLevel.CRITICAL, LogLevel.WARNING]),
            )
            .all()
        )
        if recent_logs:
            return self.detect_from_logs(recent_logs)
        return []


# ─── Anomaly Scorer ───────────────────────────────────────────────────────────

def calculate_anomaly_score(
    error_count: int,
    warning_count: int,
    total_count: int,
    time_window_minutes: int = 5,
) -> float:
    """
    Simple statistical anomaly score based on error rate.
    Returns 0.0 (normal) to 1.0 (highly anomalous).
    """
    if total_count == 0:
        return 0.0
    error_rate = error_count / total_count
    warning_rate = warning_count / total_count
    time_factor = max(1.0, 5 / time_window_minutes)  # Higher score for shorter windows
    score = (error_rate * 0.7 + warning_rate * 0.3) * time_factor
    return min(score, 1.0)
