/**
 * Dashboard Page
 * Overview of platform health, incident metrics, and live activity.
 */

import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, Activity, FileText, Clock,
  TrendingUp, Zap, RefreshCw, Database, Plus
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { incidentsAPI, logsAPI } from '../services/api'
import toast from 'react-hot-toast'
import { format, parseISO } from 'date-fns'

const SEV_COLORS = {
  critical: '#ff6b6b',
  high: '#ffb347',
  medium: '#bb86fc',
  low: '#00e676',
}

function MetricCard({ icon: Icon, label, value, sub, color = 'plasma', trend }) {
  const colors = {
    plasma: { text: '#00d4ff', bg: 'rgba(0,212,255,0.08)', border: 'rgba(0,212,255,0.2)' },
    nova: { text: '#ff6b6b', bg: 'rgba(255,107,107,0.08)', border: 'rgba(255,107,107,0.2)' },
    jade: { text: '#00e676', bg: 'rgba(0,230,118,0.08)', border: 'rgba(0,230,118,0.2)' },
    amber: { text: '#ffb347', bg: 'rgba(255,179,71,0.08)', border: 'rgba(255,179,71,0.2)' },
    violet: { text: '#bb86fc', bg: 'rgba(187,134,252,0.08)', border: 'rgba(187,134,252,0.2)' },
  }
  const c = colors[color] || colors.plasma

  return (
    <div className="metric-card" style={{ borderColor: c.border }}>
      <div className="flex items-center justify-between mb-3">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center"
             style={{ background: c.bg, border: `1px solid ${c.border}` }}>
          <Icon className="w-4 h-4" style={{ color: c.text }} />
        </div>
        {trend !== undefined && (
          <span className={`text-xs ${trend >= 0 ? 'text-nova' : 'text-jade'}`}>
            {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl font-display font-bold text-white">{value ?? '—'}</div>
      <div className="text-xs text-slate-400 mt-0.5">{label}</div>
      {sub && <div className="text-[10px] text-slate-600 mt-0.5">{sub}</div>}
    </div>
  )
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="card px-3 py-2 text-xs border-plasma/20">
      <div className="text-slate-400 mb-1">{label}</div>
      {payload.map(p => (
        <div key={p.name} style={{ color: p.color }}>{p.name}: {p.value}</div>
      ))}
    </div>
  )
}

export default function DashboardPage() {
  const [stats, setStats] = useState(null)
  const [logStats, setLogStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [seeding, setSeeding] = useState(false)
  const navigate = useNavigate()

  const load = useCallback(async () => {
    try {
      const [sRes, lRes] = await Promise.all([
        incidentsAPI.dashboardStats(7),
        logsAPI.stats(24),
      ])
      setStats(sRes.data)
      setLogStats(lRes.data)
    } catch (e) {
      toast.error('Failed to load dashboard stats')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const handleSeedDemo = async () => {
    setSeeding(true)
    try {
      await logsAPI.seedSample()
      toast.success('Sample data loaded! Refreshing...')
      setTimeout(load, 500)
    } catch {
      toast.error('Seed failed — ensure you are logged in')
    } finally {
      setSeeding(false)
    }
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[...Array(5)].map((_, i) => <div key={i} className="skeleton h-28 rounded-xl" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <div key={i} className="skeleton h-64 rounded-xl" />)}
      </div>
    </div>
  )

  const severityData = Object.entries(stats?.severity_distribution || {}).map(([name, value]) => ({
    name, value, fill: SEV_COLORS[name] || '#64748b'
  }))

  const incidentsOverTime = (stats?.incidents_over_time || []).map(d => ({
    ...d,
    date: d.date ? format(parseISO(d.date), 'MMM d') : d.date,
  }))

  const logsBySource = Object.entries(stats?.logs_by_source || {}).map(([name, value]) => ({
    name: name.replace('LogSource.', ''), value,
  }))

  return (
    <div className="p-6 space-y-6 animate-in">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-display font-semibold text-white">Operations Overview</h2>
          <p className="text-xs text-slate-500 mt-0.5">Real-time platform health and incident metrics</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleSeedDemo} disabled={seeding}
            className="btn-ghost text-xs flex items-center gap-1.5 disabled:opacity-50">
            <Database className="w-3.5 h-3.5" />
            {seeding ? 'Loading...' : 'Load Demo Data'}
          </button>
          <button onClick={load} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
          <button onClick={() => navigate('/incidents')} className="btn-primary text-xs flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5" />
            View Incidents
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <MetricCard icon={FileText} label="Total Logs" value={stats?.total_logs?.toLocaleString()} sub="All time" color="plasma" />
        <MetricCard icon={Activity} label="Logs Today" value={stats?.logs_today?.toLocaleString()} color="violet" />
        <MetricCard icon={AlertTriangle} label="Total Incidents" value={stats?.total_incidents} color="amber" />
        <MetricCard icon={Zap} label="Open Incidents" value={stats?.open_incidents} color="nova" />
        <MetricCard icon={Clock} label="Avg Resolution" value={`${stats?.avg_resolution_time_hours}h`} color="jade" />
      </div>

      {/* Alert banner for critical incidents */}
      {stats?.critical_incidents > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer"
             style={{ background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.3)' }}
             onClick={() => navigate('/incidents?severity=critical')}>
          <div className="status-dot open" />
          <span className="text-sm text-nova font-medium">
            {stats.critical_incidents} critical incident{stats.critical_incidents > 1 ? 's' : ''} require attention
          </span>
          <span className="ml-auto text-xs text-slate-500">Click to view →</span>
        </div>
      )}

      {/* Charts grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Incidents over time */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-plasma" />
            Incidents — Last 7 Days
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={incidentsOverTime}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00d4ff" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00d4ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
              <YAxis tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="count" name="Incidents"
                stroke="#00d4ff" fill="url(#incGrad)" strokeWidth={2} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Severity distribution */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Severity Distribution
          </h3>
          {severityData.length > 0 ? (
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={severityData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                     paddingAngle={3} dataKey="value">
                  {severityData.map((entry, i) => (
                    <Cell key={i} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" iconSize={8}
                        formatter={(val) => <span style={{ color: '#94a3b8', fontSize: 11 }}>{val}</span>} />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-slate-500 text-sm">
              No incidents recorded yet
            </div>
          )}
        </div>

        {/* Log sources */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-violet-400" />
            Logs by Source (24h)
          </h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={logsBySource} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#64748b', fontSize: 10 }} axisLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} axisLine={false} width={80} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="value" name="Logs" fill="#bb86fc" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top incident types */}
        <div className="card p-5">
          <h3 className="text-sm font-medium text-slate-300 mb-4 flex items-center gap-2">
            <Zap className="w-4 h-4 text-nova" />
            Top Incident Types
          </h3>
          <div className="space-y-3">
            {(stats?.top_incident_types || []).length === 0 ? (
              <div className="text-slate-500 text-sm py-8 text-center">No incidents yet — load demo data</div>
            ) : (
              stats.top_incident_types.map(({ type, count }, i) => {
                const label = String(type).replace('IncidentType.', '').replace(/_/g, ' ')
                const max = stats.top_incident_types[0]?.count || 1
                const pct = Math.round((count / max) * 100)
                return (
                  <div key={type} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300 capitalize">{label}</span>
                      <span className="text-slate-500">{count}</span>
                    </div>
                    <div className="confidence-bar">
                      <div className="confidence-fill" style={{ width: `${pct}%`,
                        background: ['#ff6b6b','#ffb347','#bb86fc','#00d4ff','#00e676'][i] }} />
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>

      {/* Log level breakdown */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Log Level Breakdown (24h)</h3>
        <div className="grid grid-cols-5 gap-3">
          {[
            { level: 'CRITICAL', color: '#ff4444', key: 'LogLevel.CRITICAL' },
            { level: 'ERROR', color: '#ff6b6b', key: 'LogLevel.ERROR' },
            { level: 'WARNING', color: '#ffb347', key: 'LogLevel.WARNING' },
            { level: 'INFO', color: '#00d4ff', key: 'LogLevel.INFO' },
            { level: 'DEBUG', color: '#64748b', key: 'LogLevel.DEBUG' },
          ].map(({ level, color, key }) => {
            const count = logStats?.by_level?.[key] || 0
            return (
              <div key={level} className="text-center p-3 rounded-lg"
                   style={{ background: `${color}0a`, border: `1px solid ${color}22` }}>
                <div className="text-xl font-display font-bold" style={{ color }}>{count}</div>
                <div className="text-xs text-slate-500 mt-0.5">{level}</div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
