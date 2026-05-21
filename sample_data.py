"""
Sample Log Data
Realistic log entries for demo and testing purposes.
Includes various incident types across multiple services.
"""

from datetime import datetime, timedelta
import random

def _t(minutes_ago: int) -> datetime:
    return datetime.utcnow() - timedelta(minutes=minutes_ago)


SAMPLE_LOGS = [
    # ─── Failed Deployment ────────────────────────────────────────────────────
    {
        "source": "kubernetes",
        "level": "WARNING",
        "message": "Deployment api-gateway: waiting for rollout to finish: 0 out of 3 new replicas have been updated",
        "service_name": "api-gateway",
        "host": "k8s-prod-01",
        "timestamp": _t(45),
    },
    {
        "source": "kubernetes",
        "level": "ERROR",
        "message": "Pod api-gateway-7d9f6b8-xkj2p: CrashLoopBackOff - container failed to start: exit code 1",
        "service_name": "api-gateway",
        "host": "k8s-prod-01",
        "timestamp": _t(43),
    },
    {
        "source": "docker",
        "level": "ERROR",
        "message": "Container api-gateway exited with code 1: Error: Cannot find module './config/database.js'",
        "service_name": "api-gateway",
        "host": "k8s-prod-01",
        "timestamp": _t(42),
    },
    {
        "source": "kubernetes",
        "level": "CRITICAL",
        "message": "Deployment api-gateway failed: image pull failed for registry.company.com/api-gateway:v2.1.3 - ImagePullBackOff",
        "service_name": "api-gateway",
        "host": "k8s-prod-01",
        "timestamp": _t(40),
    },

    # ─── Memory Spike ──────────────────────────────────────────────────────────
    {
        "source": "server",
        "level": "WARNING",
        "message": "Memory usage at 87% on host app-server-02. Free: 1.2GB / Total: 16GB",
        "service_name": "system",
        "host": "app-server-02",
        "timestamp": _t(30),
    },
    {
        "source": "application",
        "level": "ERROR",
        "message": "Java heap space: java.lang.OutOfMemoryError - GC overhead limit exceeded",
        "service_name": "payment-service",
        "host": "app-server-02",
        "timestamp": _t(28),
    },
    {
        "source": "application",
        "level": "CRITICAL",
        "message": "OOM killer activated: Killed process 14293 (java) total-vm:8388608kB, anon-rss:7340032kB",
        "service_name": "payment-service",
        "host": "app-server-02",
        "timestamp": _t(27),
    },
    {
        "source": "server",
        "level": "CRITICAL",
        "message": "Cannot allocate memory: fork: Cannot allocate memory - system memory exhausted",
        "service_name": "system",
        "host": "app-server-02",
        "timestamp": _t(26),
    },

    # ─── Auth Failures ─────────────────────────────────────────────────────────
    {
        "source": "nginx",
        "level": "WARNING",
        "message": "POST /api/auth/login 401 - Authentication failed for user admin@company.com from 185.220.101.47",
        "service_name": "nginx",
        "host": "lb-01",
        "timestamp": _t(20),
        "status_code": 401,
    },
    {
        "source": "application",
        "level": "WARNING",
        "message": "Authentication failed: Invalid credentials for user admin@company.com (attempt 3/5) from IP 185.220.101.47",
        "service_name": "auth-service",
        "host": "app-server-01",
        "timestamp": _t(19),
    },
    {
        "source": "application",
        "level": "ERROR",
        "message": "SECURITY ALERT: Brute force detected - 47 failed login attempts in 60 seconds from 185.220.101.47",
        "service_name": "auth-service",
        "host": "app-server-01",
        "timestamp": _t(18),
    },
    {
        "source": "application",
        "level": "ERROR",
        "message": "Account locked due to too many failed attempts: admin@company.com. Source IP: 185.220.101.47",
        "service_name": "auth-service",
        "host": "app-server-01",
        "timestamp": _t(17),
    },
    {
        "source": "nginx",
        "level": "ERROR",
        "message": "POST /api/auth/login 403 - Account locked: admin@company.com",
        "service_name": "nginx",
        "host": "lb-01",
        "timestamp": _t(16),
        "status_code": 403,
    },

    # ─── Service Downtime ──────────────────────────────────────────────────────
    {
        "source": "application",
        "level": "ERROR",
        "message": "Database connection failed: ECONNREFUSED 10.0.0.50:5432 - PostgreSQL is unreachable",
        "service_name": "user-service",
        "host": "app-server-03",
        "timestamp": _t(15),
    },
    {
        "source": "nginx",
        "level": "ERROR",
        "message": "GET /api/users 503 Service Unavailable - upstream: user-service timed out after 30s",
        "service_name": "nginx",
        "host": "lb-01",
        "timestamp": _t(14),
        "status_code": 503,
        "response_time_ms": 30000,
    },
    {
        "source": "application",
        "level": "CRITICAL",
        "message": "Health check FAILED for user-service: connection refused on port 8080. Service is DOWN.",
        "service_name": "monitoring",
        "host": "monitoring-01",
        "timestamp": _t(13),
    },
    {
        "source": "application",
        "level": "ERROR",
        "message": "Circuit breaker OPEN for user-service - too many consecutive failures (threshold: 5)",
        "service_name": "api-gateway",
        "host": "app-server-01",
        "timestamp": _t(12),
    },

    # ─── Traffic Spike ─────────────────────────────────────────────────────────
    {
        "source": "nginx",
        "level": "WARNING",
        "message": "Rate limit exceeded: 5000 req/min from subnet 192.168.1.0/24 - threshold: 1000 req/min",
        "service_name": "nginx",
        "host": "lb-01",
        "timestamp": _t(10),
        "status_code": 429,
    },
    {
        "source": "application",
        "level": "WARNING",
        "message": "Abnormal traffic spike detected: 12,450 requests/min (baseline: 2,000 req/min) - possible DDoS",
        "service_name": "analytics",
        "host": "app-server-01",
        "timestamp": _t(9),
    },
    {
        "source": "nginx",
        "level": "ERROR",
        "message": "Too many requests - returning 429. Blocked IPs: 47. Suspicious traffic pattern from 10 different subnets",
        "service_name": "nginx",
        "host": "lb-01",
        "timestamp": _t(8),
    },

    # ─── Database Errors ───────────────────────────────────────────────────────
    {
        "source": "application",
        "level": "ERROR",
        "message": "SQLAlchemy error: deadlock detected on table orders between transactions 456781 and 456790",
        "service_name": "order-service",
        "host": "app-server-04",
        "timestamp": _t(6),
    },
    {
        "source": "application",
        "level": "ERROR",
        "message": "Connection pool exhausted: max_connections=100 reached. Waiting for available connection (timeout: 30s)",
        "service_name": "order-service",
        "host": "app-server-04",
        "timestamp": _t(5),
    },
    {
        "source": "server",
        "level": "CRITICAL",
        "message": "PostgreSQL: too many connections. Current: 100/100. Consider increasing max_connections or using PgBouncer.",
        "service_name": "postgresql",
        "host": "db-server-01",
        "timestamp": _t(4),
    },

    # ─── Normal Logs (baseline) ────────────────────────────────────────────────
    {
        "source": "nginx",
        "level": "INFO",
        "message": "GET /api/health 200 OK - 12ms",
        "service_name": "nginx",
        "host": "lb-01",
        "timestamp": _t(60),
        "status_code": 200,
        "response_time_ms": 12,
    },
    {
        "source": "application",
        "level": "INFO",
        "message": "User login successful: john.doe@company.com from 10.0.1.25",
        "service_name": "auth-service",
        "host": "app-server-01",
        "timestamp": _t(55),
    },
    {
        "source": "application",
        "level": "INFO",
        "message": "Deployment checkout-service:v1.4.2 completed successfully. All 3 replicas healthy.",
        "service_name": "checkout-service",
        "host": "k8s-prod-01",
        "timestamp": _t(50),
    },
    {
        "source": "application",
        "level": "DEBUG",
        "message": "Cache hit rate: 94.2% - Redis connection pool: 8/20 connections active",
        "service_name": "cache-service",
        "host": "app-server-02",
        "timestamp": _t(48),
    },
]
