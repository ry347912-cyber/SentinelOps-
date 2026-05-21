/**
 * Main Layout
 * Sidebar navigation + top bar + content area.
 */

import { Outlet, NavLink, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, AlertTriangle, FileText, Brain,
  MessageSquare, Settings, LogOut, Activity, Wifi, WifiOff,
  ChevronLeft, ChevronRight, Zap, Bell
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import { useWebSocket } from '../../hooks/useWebSocket'

const NAV_ITEMS = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/incidents', icon: AlertTriangle, label: 'Incidents' },
  { to: '/logs', icon: FileText, label: 'Log Viewer' },
  { to: '/analysis', icon: Brain, label: 'AI Analysis' },
  { to: '/chatbot', icon: MessageSquare, label: 'AI Assistant' },
  { to: '/settings', icon: Settings, label: 'Settings' },
]

export default function Layout() {
  const { user, logout } = useAuth()
  const { connected, lastEvent } = useWebSocket()
  const [collapsed, setCollapsed] = useState(false)
  const location = useLocation()

  const pageName = NAV_ITEMS.find(n => location.pathname.startsWith(n.to))?.label || 'AIOps'

  return (
    <div className="flex h-screen overflow-hidden bg-void-950">
      {/* ─── Sidebar ─────────────────────────────────────────────── */}
      <aside className={`
        flex flex-col border-r border-void-700 transition-all duration-300 shrink-0
        ${collapsed ? 'w-16' : 'w-60'}
      `} style={{ background: 'linear-gradient(180deg, #040810 0%, #020408 100%)' }}>
        
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-void-700 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
               style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(187,134,252,0.3))', border: '1px solid rgba(0,212,255,0.3)' }}>
            <Zap className="w-4 h-4 text-plasma" />
          </div>
          {!collapsed && (
            <div>
              <div className="text-sm font-semibold font-display text-white leading-tight">AIOps</div>
              <div className="text-[10px] text-slate-500 leading-tight">Incident Platform</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-4 px-2 space-y-0.5">
          {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => `
                flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                transition-all duration-150 group relative overflow-hidden
                ${isActive
                  ? 'text-plasma bg-plasma/10 border border-plasma/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/4'
                }
                ${collapsed ? 'justify-center' : ''}
              `}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span>{label}</span>}
              {collapsed && (
                <div className="absolute left-full ml-2 px-2 py-1 bg-void-700 text-white text-xs rounded
                               opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                  {label}
                </div>
              )}
            </NavLink>
          ))}
        </nav>

        {/* WS Status */}
        <div className={`px-3 py-2 ${collapsed ? 'flex justify-center' : ''}`}>
          <div className={`flex items-center gap-2 px-2 py-1.5 rounded-lg ${collapsed ? '' : 'text-xs'}`}
               style={{ background: connected ? 'rgba(0,230,118,0.08)' : 'rgba(255,107,107,0.08)' }}>
            {connected
              ? <Wifi className="w-3 h-3 text-jade shrink-0" />
              : <WifiOff className="w-3 h-3 text-nova shrink-0" />
            }
            {!collapsed && (
              <span className={`text-xs ${connected ? 'text-jade' : 'text-nova'}`}>
                {connected ? 'Live' : 'Offline'}
              </span>
            )}
          </div>
        </div>

        {/* User & Collapse */}
        <div className="border-t border-void-700 p-3 space-y-2">
          {!collapsed && (
            <div className="flex items-center gap-2 px-2 py-1">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                   style={{ background: 'linear-gradient(135deg, rgba(0,212,255,0.3), rgba(187,134,252,0.3))' }}>
                {user?.username?.[0]?.toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-slate-300 truncate">{user?.username}</div>
                <div className="text-[10px] text-slate-500 truncate">{user?.role}</div>
              </div>
            </div>
          )}
          <div className="flex gap-1">
            <button onClick={logout}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs text-slate-400 hover:text-nova hover:bg-nova/10 transition-all ${collapsed ? 'justify-center flex-1' : ''}`}>
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!collapsed && 'Logout'}
            </button>
            <button onClick={() => setCollapsed(!collapsed)}
              className="ml-auto flex items-center justify-center w-8 h-8 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-white/4 transition-all">
              {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </aside>

      {/* ─── Main Content ──────────────────────────────────────────── */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-6 border-b border-void-700 shrink-0"
                style={{ background: 'rgba(4,8,16,0.9)', backdropFilter: 'blur(8px)' }}>
          <div className="flex items-center gap-3">
            <Activity className="w-4 h-4 text-plasma" />
            <h1 className="font-display text-sm font-semibold text-slate-200">{pageName}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-slate-500">
              {new Date().toLocaleString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} UTC
            </div>
            {lastEvent?.type === 'new_incident' && (
              <div className="flex items-center gap-1.5 px-2 py-1 rounded-full text-xs text-nova"
                   style={{ background: 'rgba(255,107,107,0.1)', border: '1px solid rgba(255,107,107,0.2)' }}>
                <Bell className="w-3 h-3" />
                New incident
              </div>
            )}
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-void-grid" style={{ backgroundSize: '40px 40px' }}>
          <div className="min-h-full">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
