/**
 * Settings Page
 * Platform configuration and user preferences.
 */

import { useState } from 'react'
import { Settings, Key, Server, Bell, Shield, Save, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import toast from 'react-hot-toast'

function SettingSection({ title, icon: Icon, children }) {
  return (
    <div className="card p-5 space-y-4">
      <div className="flex items-center gap-2 pb-3 border-b border-void-700">
        <Icon className="w-4 h-4 text-plasma" />
        <h3 className="text-sm font-medium text-slate-200">{title}</h3>
      </div>
      {children}
    </div>
  )
}

function SettingRow({ label, desc, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex-1">
        <div className="text-sm text-slate-300">{label}</div>
        {desc && <div className="text-xs text-slate-500 mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const { user } = useAuth()
  const [showKey, setShowKey] = useState(false)
  const [apiKey, setApiKey] = useState('')
  const [notifications, setNotifications] = useState({
    newIncident: true,
    criticalOnly: false,
    weeklyReport: true,
  })

  return (
    <div className="p-6 space-y-5 animate-in max-w-2xl">
      <div>
        <h2 className="text-lg font-display font-semibold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-plasma" />
          Settings
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">Configure your AIOps Platform</p>
      </div>

      {/* Profile */}
      <SettingSection title="Profile" icon={Shield}>
        <SettingRow label="Username" desc="Your login identifier">
          <span className="text-sm text-slate-400 font-mono-custom">{user?.username}</span>
        </SettingRow>
        <SettingRow label="Role" desc="Your access level">
          <span className={`text-xs px-2 py-1 rounded ${user?.role === 'admin' ? 'text-nova bg-nova/10' : 'text-plasma bg-plasma/10'}`}>
            {user?.role}
          </span>
        </SettingRow>
        <SettingRow label="Email">
          <span className="text-sm text-slate-400">{user?.email}</span>
        </SettingRow>
      </SettingSection>

      {/* AI Configuration */}
      <SettingSection title="AI Configuration" icon={Key}>
        <div className="p-3 rounded-lg text-xs space-y-1"
             style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
          <p className="text-plasma font-medium">Backend Configuration Required</p>
          <p className="text-slate-400">
            Set <code className="bg-void-700 px-1 rounded font-mono-custom">ANTHROPIC_API_KEY</code> in 
            your backend <code className="bg-void-700 px-1 rounded font-mono-custom">.env</code> file.
            The API key is never stored in the frontend.
          </p>
        </div>

        <SettingRow label="AI Model" desc="Claude model used for analysis">
          <span className="text-xs text-slate-400 font-mono-custom bg-void-700 px-2 py-1 rounded">
            claude-sonnet-4-20250514
          </span>
        </SettingRow>

        <SettingRow label="Analysis Features">
          <div className="flex flex-col gap-1 text-right">
            {['Root Cause Analysis', 'Remediation Steps', 'AI Summaries', 'Chat Assistant'].map(f => (
              <div key={f} className="flex items-center gap-1.5 text-xs text-jade">
                <div className="w-1.5 h-1.5 rounded-full bg-jade" />
                {f}
              </div>
            ))}
          </div>
        </SettingRow>
      </SettingSection>

      {/* Notifications */}
      <SettingSection title="Notifications" icon={Bell}>
        {[
          { key: 'newIncident', label: 'New Incident Alerts', desc: 'Toast notifications for all new incidents' },
          { key: 'criticalOnly', label: 'Critical Only', desc: 'Only alert on critical severity incidents' },
          { key: 'weeklyReport', label: 'Weekly Summary', desc: 'Email summary of weekly incident stats' },
        ].map(({ key, label, desc }) => (
          <SettingRow key={key} label={label} desc={desc}>
            <button
              onClick={() => setNotifications(n => ({ ...n, [key]: !n[key] }))}
              className={`w-10 h-5 rounded-full transition-all duration-200 relative ${
                notifications[key] ? 'bg-plasma/40' : 'bg-void-600'
              }`}>
              <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 ${
                notifications[key] ? 'left-5 bg-plasma' : 'left-0.5 bg-slate-500'
              }`} />
            </button>
          </SettingRow>
        ))}
      </SettingSection>

      {/* Backend info */}
      <SettingSection title="Platform Info" icon={Server}>
        <SettingRow label="API Base URL">
          <code className="text-xs text-slate-400 font-mono-custom bg-void-700 px-2 py-1 rounded">
            {window.location.origin}/api
          </code>
        </SettingRow>
        <SettingRow label="WebSocket">
          <code className="text-xs text-slate-400 font-mono-custom bg-void-700 px-2 py-1 rounded">
            ws://{window.location.host}/ws/events
          </code>
        </SettingRow>
        <SettingRow label="Version">
          <span className="text-xs text-slate-400">AIOps Platform v1.0.0</span>
        </SettingRow>
        <SettingRow label="Database">
          <span className="text-xs text-slate-400">SQLite / PostgreSQL</span>
        </SettingRow>
      </SettingSection>

      {/* Environment */}
      <div className="card p-5">
        <h3 className="text-sm font-medium text-slate-300 mb-3 flex items-center gap-2">
          <Server className="w-4 h-4 text-slate-500" />
          .env Configuration Reference
        </h3>
        <div className="terminal text-xs space-y-1 leading-relaxed">
          {[
            '# Required for AI features',
            'ANTHROPIC_API_KEY=sk-ant-...',
            '',
            '# Database (default: SQLite)',
            'DATABASE_URL=sqlite:///./aiops.db',
            '',
            '# Security',
            'SECRET_KEY=your-secret-key-here',
            '',
            '# Optional: PostgreSQL',
            'DATABASE_URL=postgresql://user:pass@localhost/aiops',
          ].map((line, i) => (
            <div key={i} className={line.startsWith('#') ? 'text-slate-500' : line === '' ? 'h-2' : 'text-plasma'}>
              {line}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
