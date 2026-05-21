/**
 * Log Viewer Page
 * Live log stream with upload, filters, and real-time display.
 */

import { useState, useEffect, useRef, useCallback } from 'react'
import { Upload, Filter, RefreshCw, FileText, AlertCircle, Search } from 'lucide-react'
import { logsAPI } from '../services/api'
import { format, parseISO } from 'date-fns'
import toast from 'react-hot-toast'

const LEVEL_COLORS = {
  CRITICAL: { text: '#ff4444', bg: 'rgba(255,68,68,0.08)', border: '#ff444433' },
  ERROR: { text: '#ff6b6b', bg: 'rgba(255,107,107,0.06)', border: '#ff6b6b22' },
  WARNING: { text: '#ffb347', bg: 'rgba(255,179,71,0.06)', border: '#ffb34722' },
  INFO: { text: '#94a3b8', bg: 'transparent', border: 'transparent' },
  DEBUG: { text: '#475569', bg: 'transparent', border: 'transparent' },
}

function LogLine({ log }) {
  const lvl = String(log.level).replace('LogLevel.', '')
  const c = LEVEL_COLORS[lvl] || LEVEL_COLORS.INFO
  const ts = log.timestamp ? format(parseISO(log.timestamp), 'HH:mm:ss.SSS') : ''
  const src = String(log.source || '').replace('LogSource.', '')

  return (
    <div className="flex items-start gap-2 px-3 py-1.5 border-b border-void-700/30 hover:bg-white/2 font-mono-custom text-xs group transition-colors"
         style={{ borderLeftColor: c.text, borderLeftWidth: 2, background: c.bg }}>
      <span className="text-slate-600 shrink-0 w-24">{ts}</span>
      <span className="shrink-0 w-16 text-center px-1 py-0.5 rounded text-[10px] font-bold"
            style={{ color: c.text, background: `${c.text}15` }}>{lvl}</span>
      {log.service_name && (
        <span className="text-plasma/70 shrink-0 max-w-[8rem] truncate">[{log.service_name}]</span>
      )}
      {src && <span className="text-slate-600 shrink-0">{src}</span>}
      <span className="text-slate-300 flex-1 break-all">{log.message}</span>
      {log.status_code && (
        <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${
          log.status_code >= 500 ? 'text-nova bg-nova/10' :
          log.status_code >= 400 ? 'text-amber-custom bg-amber-custom/10' :
          'text-jade bg-jade/10'
        }`}>{log.status_code}</span>
      )}
    </div>
  )
}

export default function LogsPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState(null)
  const [autoScroll, setAutoScroll] = useState(true)
  const [uploading, setUploading] = useState(false)

  // Filters
  const [source, setSource] = useState('')
  const [level, setLevel] = useState('')
  const [service, setService] = useState('')
  const [hours, setHours] = useState(24)

  const bottomRef = useRef(null)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [lRes, sRes] = await Promise.all([
        logsAPI.list({ source: source || undefined, level: level || undefined, service: service || undefined, hours }),
        logsAPI.stats(hours),
      ])
      setLogs(lRes.data)
      setStats(sRes.data)
    } catch { toast.error('Failed to load logs') }
    finally { setLoading(false) }
  }, [source, level, service, hours])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.append('file', file)
    fd.append('source', source || 'application')
    setUploading(true)
    try {
      const res = await logsAPI.uploadFile(fd)
      const d = res.data
      toast.success(`Ingested ${d.total_logs} logs · ${d.incidents_detected} incidents detected`)
      load()
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Upload failed')
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  const errorCount = logs.filter(l => String(l.level).includes('ERROR') || String(l.level).includes('CRITICAL')).length
  const warnCount = logs.filter(l => String(l.level).includes('WARNING')).length

  return (
    <div className="flex flex-col h-full p-6 gap-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-plasma" />
            Live Log Viewer
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">{logs.length} entries · {errorCount} errors · {warnCount} warnings</p>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept=".txt,.log,.json" onChange={handleFileUpload} className="hidden" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading}
            className="btn-primary text-xs flex items-center gap-1.5 disabled:opacity-50">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? 'Uploading...' : 'Upload Logs'}
          </button>
          <button onClick={load} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="flex gap-3 shrink-0 flex-wrap">
          {[
            { label: 'Total', val: stats.total, color: '#00d4ff' },
            { label: 'Errors', val: errorCount, color: '#ff6b6b' },
            { label: 'Warnings', val: warnCount, color: '#ffb347' },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
                 style={{ background: `${color}08`, border: `1px solid ${color}22` }}>
              <div className="w-1.5 h-1.5 rounded-full" style={{ background: color }} />
              <span className="text-xs text-slate-400">{label}:</span>
              <span className="text-xs font-bold" style={{ color }}>{val}</span>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap shrink-0">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
          <input value={service} onChange={e => setService(e.target.value)}
            className="input-field pl-8 text-xs" placeholder="Filter by service..." />
        </div>
        <select value={source} onChange={e => setSource(e.target.value)} className="input-field text-xs w-36">
          <option value="">All Sources</option>
          <option value="server">Server</option>
          <option value="docker">Docker</option>
          <option value="application">Application</option>
          <option value="nginx">Nginx</option>
          <option value="kubernetes">Kubernetes</option>
        </select>
        <select value={level} onChange={e => setLevel(e.target.value)} className="input-field text-xs w-36">
          <option value="">All Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="ERROR">Error</option>
          <option value="WARNING">Warning</option>
          <option value="INFO">Info</option>
          <option value="DEBUG">Debug</option>
        </select>
        <select value={hours} onChange={e => setHours(Number(e.target.value))} className="input-field text-xs w-24">
          <option value={1}>1h</option>
          <option value={6}>6h</option>
          <option value={24}>24h</option>
          <option value={72}>72h</option>
          <option value={168}>7d</option>
        </select>
        <label className="flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer text-xs text-slate-400"
               style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <input type="checkbox" checked={autoScroll} onChange={e => setAutoScroll(e.target.checked)}
            className="accent-plasma w-3 h-3" />
          Auto-scroll
        </label>
      </div>

      {/* Log terminal */}
      <div className="flex-1 overflow-y-auto rounded-xl border border-void-600 min-h-0"
           style={{ background: 'rgba(0,0,0,0.5)', fontFamily: 'JetBrains Mono, monospace' }}>
        {/* Terminal header */}
        <div className="sticky top-0 flex items-center gap-3 px-3 py-2 border-b border-void-700"
             style={{ background: 'rgba(4,8,16,0.95)', backdropFilter: 'blur(8px)' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-nova/60" />
            <div className="w-3 h-3 rounded-full bg-amber-custom/60" />
            <div className="w-3 h-3 rounded-full bg-jade/60" />
          </div>
          <span className="text-xs text-slate-500 font-mono-custom">
            aiops-platform — log stream — {logs.length} entries
          </span>
          <div className="ml-auto flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-jade animate-pulse-slow" />
            <span className="text-[10px] text-jade">LIVE</span>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-xs">Loading logs...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center">
            <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No logs found. Upload a log file or load demo data.</p>
          </div>
        ) : (
          <>
            {logs.map((log, i) => <LogLine key={log.id || i} log={log} />)}
            <div ref={bottomRef} />
          </>
        )}
      </div>

      {/* Upload hint */}
      <div className="shrink-0 flex items-center gap-2 text-xs text-slate-600">
        <AlertCircle className="w-3.5 h-3.5" />
        Supports TXT, LOG, and JSON formats · Sources: server, docker, nginx, kubernetes, application
      </div>
    </div>
  )
}
