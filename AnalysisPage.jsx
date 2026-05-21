/**
 * Analysis Page
 * Bulk AI analysis runner and incident analysis queue.
 */

import { useState, useEffect } from 'react'
import { Brain, Play, CheckCircle, Clock, AlertTriangle, Zap, BarChart2 } from 'lucide-react'
import { incidentsAPI, analysisAPI } from '../services/api'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AnalysisPage() {
  const [incidents, setIncidents] = useState([])
  const [running, setRunning] = useState({})
  const [done, setDone] = useState({})
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    incidentsAPI.list({ status: 'open', page_size: 20 })
      .then(r => setIncidents(r.data.incidents))
      .catch(() => toast.error('Failed to load incidents'))
      .finally(() => setLoading(false))
  }, [])

  const analyze = async (id) => {
    setRunning(r => ({ ...r, [id]: true }))
    try {
      await analysisAPI.runAnalysis(id)
      setDone(d => ({ ...d, [id]: true }))
      toast.success(`Analysis complete for incident #${id}`)
    } catch {
      toast.error(`Analysis failed for #${id} — check API key`)
    } finally {
      setRunning(r => ({ ...r, [id]: false }))
    }
  }

  const analyzeAll = async () => {
    const unanalyzed = incidents.filter(i => !i.root_cause && !done[i.id])
    if (unanalyzed.length === 0) return toast('All incidents already analyzed!')
    toast(`Running analysis on ${unanalyzed.length} incidents...`)
    for (const inc of unanalyzed) {
      await analyze(inc.id)
    }
  }

  const sev = (inc) => String(inc.severity).replace('IncidentSeverity.', '')
  const type = (inc) => String(inc.incident_type).replace('IncidentType.', '').replace(/_/g, ' ')

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            <Brain className="w-5 h-5 text-violet-400" />
            AI Analysis Center
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Run Claude AI on open incidents for root cause & remediation</p>
        </div>
        <button onClick={analyzeAll}
          className="btn-primary flex items-center gap-2 text-xs">
          <Zap className="w-3.5 h-3.5" />
          Analyze All Open
        </button>
      </div>

      {/* How it works */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: FileText2, label: '1. Ingest Logs', desc: 'Upload or stream logs from any source', color: '#00d4ff' },
          { icon: Brain, label: '2. Detect Incident', desc: 'Rule-based + AI anomaly detection', color: '#bb86fc' },
          { icon: SearchCode, label: '3. Root Cause', desc: 'Claude analyzes timeline & patterns', color: '#ffb347' },
          { icon: Wrench, label: '4. Remediate', desc: 'Get specific commands & steps', color: '#00e676' },
        ].map(({ icon: Icon, label, desc, color }) => (
          <div key={label} className="card p-4 text-center space-y-2">
            <div className="w-9 h-9 rounded-xl mx-auto flex items-center justify-center"
                 style={{ background: `${color}12`, border: `1px solid ${color}30` }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <div className="text-xs font-medium text-slate-200">{label}</div>
            <div className="text-[10px] text-slate-500">{desc}</div>
          </div>
        ))}
      </div>

      {/* Incident queue */}
      <div>
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <BarChart2 className="w-4 h-4 text-plasma" />
          Open Incidents Queue
        </h3>

        {loading ? (
          <div className="space-y-2">
            {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-20 rounded-xl" />)}
          </div>
        ) : incidents.length === 0 ? (
          <div className="card p-10 text-center">
            <CheckCircle className="w-10 h-10 text-jade mx-auto mb-2" />
            <p className="text-slate-300 text-sm">No open incidents!</p>
            <p className="text-slate-500 text-xs mt-1">Load demo data from Dashboard to get started</p>
          </div>
        ) : (
          <div className="space-y-2">
            {incidents.map(inc => {
              const isRunning = running[inc.id]
              const isDone = done[inc.id] || !!inc.root_cause
              const sevBadge = { critical: 'badge-critical', high: 'badge-high', medium: 'badge-medium', low: 'badge-low' }

              return (
                <div key={inc.id} className="card p-4 flex items-center gap-4"
                     style={{ borderColor: isDone ? 'rgba(0,230,118,0.2)' : undefined }}>
                  {/* Status icon */}
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                    isDone ? 'bg-jade/10' : isRunning ? 'bg-violet/10' : 'bg-white/4'
                  }`}>
                    {isDone
                      ? <CheckCircle className="w-4 h-4 text-jade" />
                      : isRunning
                        ? <div className="w-4 h-4 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                        : <Brain className="w-4 h-4 text-slate-500" />
                    }
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={sevBadge[sev(inc)] || 'badge-medium'}>{sev(inc)}</span>
                      <span className="text-xs text-slate-500 capitalize">{type(inc)}</span>
                    </div>
                    <div className="text-sm text-slate-200 truncate">#{inc.id} — {inc.title}</div>
                    {isDone && (
                      <div className="text-xs text-jade mt-0.5">
                        ✓ {inc.root_cause || 'Analysis complete'}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {isDone && (
                      <button onClick={() => navigate(`/incidents/${inc.id}`)}
                        className="btn-ghost text-xs px-3">
                        View →
                      </button>
                    )}
                    <button
                      onClick={() => analyze(inc.id)}
                      disabled={isRunning}
                      className={`text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 ${
                        isDone ? 'btn-ghost' : 'btn-primary'
                      }`}>
                      {isRunning
                        ? <><div className="w-3 h-3 border border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />Analyzing</>
                        : isDone
                          ? <><Play className="w-3 h-3" />Re-analyze</>
                          : <><Play className="w-3 h-3" />Analyze</>
                      }
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Info note */}
      <div className="flex items-start gap-2 px-4 py-3 rounded-lg text-xs"
           style={{ background: 'rgba(0,212,255,0.04)', border: '1px solid rgba(0,212,255,0.15)' }}>
        <Zap className="w-3.5 h-3.5 text-plasma shrink-0 mt-0.5" />
        <div className="text-slate-400">
          AI analysis uses the <strong className="text-plasma">Anthropic Claude</strong> API. 
          Set your <code className="text-plasma font-mono-custom">ANTHROPIC_API_KEY</code> in the 
          backend <code className="text-plasma font-mono-custom">.env</code> file to enable full AI features.
          Without a key, fallback rule-based analysis is used.
        </div>
      </div>
    </div>
  )
}

// Inline icon aliases for cleaner code above
const FileText2 = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
  </svg>
)
const SearchCode = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="m9 9-2 2 2 2" /><path d="m13 13 2-2-2-2" />
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const Wrench = ({ className, style }) => (
  <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
    <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
  </svg>
)
