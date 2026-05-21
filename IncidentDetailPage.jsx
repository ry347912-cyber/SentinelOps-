/**
 * Incident Detail Page
 * Full AI analysis view: root cause, remediation steps, summaries, timeline.
 */

import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Brain, Wrench, FileText, Clock, CheckCircle,
  AlertTriangle, ChevronDown, ChevronUp, Download, Zap,
  Terminal, Copy, Check, RefreshCw, ExternalLink
} from 'lucide-react'
import { incidentsAPI, analysisAPI, downloadFile } from '../services/api'
import { formatDistanceToNow, parseISO, format } from 'date-fns'
import toast from 'react-hot-toast'

function CopyBtn({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy} className="p-1 rounded text-slate-500 hover:text-slate-300 transition-colors">
      {copied ? <Check className="w-3 h-3 text-jade" /> : <Copy className="w-3 h-3" />}
    </button>
  )
}

function SectionCard({ title, icon: Icon, color = '#00d4ff', children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="card overflow-hidden">
      <button onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 hover:bg-white/2 transition-colors">
        <div className="flex items-center gap-2">
          <Icon className="w-4 h-4" style={{ color }} />
          <span className="text-sm font-medium text-slate-200">{title}</span>
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
      </button>
      {open && <div className="px-4 pb-4 border-t border-void-700 pt-4">{children}</div>}
    </div>
  )
}

function ConfidenceMeter({ value }) {
  const pct = Math.round((value || 0) * 100)
  const color = pct >= 80 ? '#00e676' : pct >= 60 ? '#ffb347' : '#ff6b6b'
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1 confidence-bar">
        <div className="confidence-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-sm font-bold font-mono-custom" style={{ color }}>{pct}%</span>
    </div>
  )
}

export default function IncidentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [incident, setIncident] = useState(null)
  const [logs, setLogs] = useState([])
  const [analysis, setAnalysis] = useState(null)
  const [loading, setLoading] = useState(true)
  const [analyzing, setAnalyzing] = useState(false)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const [iRes, lRes] = await Promise.all([
          incidentsAPI.get(id),
          incidentsAPI.getLogs(id),
        ])
        setIncident(iRes.data)
        setLogs(lRes.data)
        // Load cached analysis if exists
        if (iRes.data.root_cause) {
          setAnalysis({
            rootCause: iRes.data.root_cause,
            reasoning: JSON.parse(iRes.data.root_cause_reasoning || '[]'),
            remediation: iRes.data.remediation_steps || [],
            technicalSummary: iRes.data.ai_summary_technical,
            managementSummary: iRes.data.ai_summary_management,
          })
        }
      } catch { toast.error('Failed to load incident') }
      finally { setLoading(false) }
    }
    load()
  }, [id])

  const runAnalysis = async () => {
    setAnalyzing(true)
    try {
      const res = await analysisAPI.runAnalysis(id)
      const d = res.data
      setAnalysis({
        rootCause: d.root_cause?.root_cause,
        reasoning: d.root_cause?.reasoning_trace || [],
        remediation: d.remediation?.steps || [],
        technicalSummary: d.summary?.technical_summary,
        managementSummary: d.summary?.management_summary,
      })
      // Refresh incident
      const iRes = await incidentsAPI.get(id)
      setIncident(iRes.data)
      toast.success('AI analysis complete!')
    } catch { toast.error('Analysis failed — check API key configuration') }
    finally { setAnalyzing(false) }
  }

  const handleResolve = async () => {
    try {
      await incidentsAPI.resolve(id)
      const iRes = await incidentsAPI.get(id)
      setIncident(iRes.data)
      toast.success('Incident resolved!')
    } catch { toast.error('Failed to resolve') }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await analysisAPI.exportJson(id)
      downloadFile(res.data, `incident_${id}_report.json`)
      toast.success('Report exported')
    } catch { toast.error('Export failed') }
    finally { setExporting(false) }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="skeleton h-8 w-64 rounded" />
      <div className="skeleton h-32 rounded-xl" />
      <div className="skeleton h-48 rounded-xl" />
    </div>
  )

  if (!incident) return (
    <div className="p-6 text-center text-slate-500">Incident not found</div>
  )

  const sev = String(incident.severity).replace('IncidentSeverity.', '')
  const status = String(incident.status).replace('IncidentStatus.', '')
  const type = String(incident.incident_type).replace('IncidentType.', '').replace(/_/g, ' ')
  const detectedAt = incident.detected_at ? parseISO(incident.detected_at) : null

  const sevColors = { critical: '#ff6b6b', high: '#ffb347', medium: '#bb86fc', low: '#00e676' }
  const sevColor = sevColors[sev] || '#64748b'

  return (
    <div className="p-6 space-y-4 animate-in max-w-5xl">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate('/incidents')}
          className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-slate-200 transition-colors">
          <ArrowLeft className="w-4 h-4" />
          All Incidents
        </button>
        <div className="flex gap-2">
          <button onClick={handleExport} disabled={exporting}
            className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
            <Download className="w-3.5 h-3.5" />
            {exporting ? 'Exporting...' : 'Export JSON'}
          </button>
          {status !== 'resolved' && status !== 'closed' && (
            <button onClick={handleResolve} className="btn-primary text-xs flex items-center gap-1.5">
              <CheckCircle className="w-3.5 h-3.5" />
              Resolve
            </button>
          )}
        </div>
      </div>

      {/* Incident Header */}
      <div className="card-glow p-5" style={{ borderColor: `${sevColor}33` }}>
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
               style={{ background: `${sevColor}15`, border: `1px solid ${sevColor}40` }}>
            <AlertTriangle className="w-5 h-5" style={{ color: sevColor }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={`badge-${sev}`}>{sev}</span>
              <span className="text-xs text-slate-500 capitalize">{type}</span>
              <span className={`text-xs px-2 py-0.5 rounded ${status === 'open' ? 'text-nova' : status === 'resolved' ? 'text-jade' : 'text-amber-custom'}`}
                    style={{ background: status === 'open' ? 'rgba(255,107,107,0.1)' : status === 'resolved' ? 'rgba(0,230,118,0.1)' : 'rgba(255,179,71,0.1)' }}>
                {status}
              </span>
              <span className="text-xs text-slate-600">#{incident.id}</span>
            </div>
            <h2 className="text-base font-display font-semibold text-white">{incident.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {detectedAt ? formatDistanceToNow(detectedAt, { addSuffix: true }) : '—'}
              </span>
              {incident.impacted_services?.length > 0 && (
                <span>{incident.impacted_services.length} service(s) affected</span>
              )}
              <span>Score: <strong style={{ color: sevColor }}>{incident.severity_score?.toFixed(1)}/10</strong></span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-3xl font-display font-bold" style={{ color: sevColor }}>
              {incident.severity_score?.toFixed(1)}
            </div>
            <div className="text-xs text-slate-500">severity</div>
          </div>
        </div>

        {/* Services + confidence */}
        {incident.impacted_services?.length > 0 && (
          <div className="mt-4 pt-4 border-t border-void-700 flex items-center gap-3 flex-wrap">
            <span className="text-xs text-slate-500">Impacted:</span>
            {incident.impacted_services.map(s => (
              <span key={s} className="text-xs text-plasma bg-plasma/8 px-2 py-1 rounded font-mono-custom">{s}</span>
            ))}
          </div>
        )}
        <div className="mt-3">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span>Detection Confidence</span>
            <span>{Math.round((incident.confidence_score || 0) * 100)}%</span>
          </div>
          <ConfidenceMeter value={incident.confidence_score} />
        </div>
      </div>

      {/* AI Analysis trigger */}
      {!analysis && (
        <div className="card p-6 text-center border-dashed border-plasma/20">
          <Brain className="w-10 h-10 text-plasma/40 mx-auto mb-3" />
          <p className="text-sm text-slate-300 mb-1">AI Analysis not yet run</p>
          <p className="text-xs text-slate-500 mb-4">
            Run Claude AI to get root cause, remediation steps, and summaries
          </p>
          <button onClick={runAnalysis} disabled={analyzing}
            className="btn-primary flex items-center gap-2 mx-auto disabled:opacity-50">
            {analyzing
              ? <div className="w-4 h-4 border-2 border-plasma/30 border-t-plasma rounded-full animate-spin" />
              : <Brain className="w-4 h-4" />}
            {analyzing ? 'Analyzing with Claude AI...' : 'Run AI Analysis'}
          </button>
        </div>
      )}

      {/* Analysis Results */}
      {analysis && (
        <div className="space-y-4">
          {/* Root Cause */}
          <SectionCard title="Root Cause Analysis" icon={Brain} color="#00d4ff">
            <div className="space-y-4">
              <div className="p-3 rounded-lg" style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.15)' }}>
                <p className="text-sm text-slate-200">{analysis.rootCause}</p>
              </div>
              {analysis.reasoning?.length > 0 && (
                <div>
                  <p className="text-xs text-slate-500 mb-2 font-medium">Reasoning Trace</p>
                  <div className="space-y-2">
                    {analysis.reasoning.map((step, i) => (
                      <div key={i} className="flex gap-3 text-xs">
                        <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 font-bold text-[10px]"
                              style={{ background: 'rgba(0,212,255,0.15)', color: '#00d4ff' }}>{i + 1}</span>
                        <span className="text-slate-300 leading-relaxed">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex justify-end">
                <button onClick={runAnalysis} disabled={analyzing}
                  className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
                  <RefreshCw className="w-3 h-3" />
                  {analyzing ? 'Reanalyzing...' : 'Re-analyze'}
                </button>
              </div>
            </div>
          </SectionCard>

          {/* Remediation */}
          <SectionCard title="Remediation Steps" icon={Wrench} color="#ffb347">
            <div className="space-y-3">
              {(analysis.remediation || []).map((step, i) => (
                <div key={i} className="flex gap-3 p-3 rounded-lg"
                     style={{ background: 'rgba(255,179,71,0.04)', border: '1px solid rgba(255,179,71,0.1)' }}>
                  <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0 font-bold text-xs"
                       style={{ background: 'rgba(255,179,71,0.15)', color: '#ffb347' }}>
                    {step.step || i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-200">{step.title}</span>
                      {step.type && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded text-slate-500 bg-white/4">{step.type}</span>
                      )}
                      {step.automated && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded text-jade bg-jade/10">auto</span>
                      )}
                      {step.estimated_time && (
                        <span className="text-[10px] text-slate-500 ml-auto">⏱ {step.estimated_time}</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 mb-2">{step.description}</p>
                    {step.command && (
                      <div className="terminal flex items-center justify-between gap-2 py-2">
                        <code className="text-xs text-plasma truncate">{step.command}</code>
                        <CopyBtn text={step.command} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* Summaries */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SectionCard title="Technical Summary" icon={Terminal} color="#bb86fc">
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.technicalSummary}</p>
            </SectionCard>
            <SectionCard title="Management Summary" icon={FileText} color="#00e676">
              <p className="text-sm text-slate-300 leading-relaxed">{analysis.managementSummary}</p>
            </SectionCard>
          </div>
        </div>
      )}

      {/* Timeline */}
      {incident.timeline_events?.length > 0 && (
        <SectionCard title="Event Timeline" icon={Clock} color="#64748b" defaultOpen={false}>
          <div className="space-y-2 relative">
            <div className="absolute left-2 top-0 bottom-0 w-px bg-void-600" />
            {incident.timeline_events.map((ev, i) => {
              const lvl = String(ev.level).replace('LogLevel.', '')
              const levelColors = { CRITICAL: '#ff4444', ERROR: '#ff6b6b', WARNING: '#ffb347', INFO: '#00d4ff', DEBUG: '#64748b' }
              const lc = levelColors[lvl] || '#64748b'
              return (
                <div key={i} className="pl-7 relative">
                  <div className="absolute left-0 w-5 h-5 rounded-full flex items-center justify-center"
                       style={{ background: `${lc}20`, border: `1px solid ${lc}60`, top: '2px' }}>
                    <div className="w-1.5 h-1.5 rounded-full" style={{ background: lc }} />
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono-custom">{ev.time}</div>
                  <div className="text-xs text-slate-300 mt-0.5">{ev.event}</div>
                  {ev.service && <div className="text-[10px] text-plasma mt-0.5">{ev.service}</div>}
                </div>
              )
            })}
          </div>
        </SectionCard>
      )}

      {/* Related Logs */}
      <SectionCard title={`Related Logs (${logs.length})`} icon={FileText} color="#64748b" defaultOpen={false}>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {logs.length === 0 ? (
            <p className="text-xs text-slate-500">No logs linked to this incident</p>
          ) : logs.map((log, i) => {
            const lvl = String(log.level).replace('LogLevel.', '')
            return (
              <div key={i} className={`px-3 py-1.5 rounded text-xs font-mono-custom log-${lvl.toLowerCase()}`}>
                <span className="text-slate-500 mr-2">{log.timestamp?.slice(11, 19)}</span>
                <span className="mr-2 font-medium" style={{ color: lvl === 'ERROR' || lvl === 'CRITICAL' ? '#ff6b6b' : lvl === 'WARNING' ? '#ffb347' : '#64748b' }}>
                  [{lvl}]
                </span>
                {log.service_name && <span className="text-plasma mr-2">[{log.service_name}]</span>}
                <span className="text-slate-300">{log.message}</span>
              </div>
            )
          })}
        </div>
      </SectionCard>
    </div>
  )
}
