/**
 * AI Chatbot Page
 * Natural language interface for querying incidents and getting guidance.
 */

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Zap, MessageSquare, Terminal, RefreshCw } from 'lucide-react'
import { chatbotAPI, incidentsAPI } from '../services/api'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'

const STARTERS = [
  "What are the most critical open incidents right now?",
  "How do I rollback a failed Kubernetes deployment?",
  "What causes memory spikes in Java applications?",
  "Explain the difference between CrashLoopBackOff and OOMKilled",
  "Show me remediation steps for a database connection pool exhaustion",
  "What monitoring should I set up to prevent service downtime?",
]

function MessageBubble({ msg }) {
  const isUser = msg.role === 'user'
  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''} animate-in`}>
      {/* Avatar */}
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-plasma/10 border border-plasma/20'
          : 'bg-violet/10 border border-violet/20'
      }`}>
        {isUser
          ? <User className="w-4 h-4 text-plasma" />
          : <Bot className="w-4 h-4 text-violet-400" />
        }
      </div>

      {/* Content */}
      <div className={`flex-1 max-w-[80%] ${isUser ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        <div className={`text-[10px] ${isUser ? 'text-right text-slate-500' : 'text-slate-500'}`}>
          {isUser ? 'You' : 'Claude AI'} · {new Date(msg.ts).toLocaleTimeString('en', { hour: '2-digit', minute: '2-digit' })}
        </div>
        <div className={`px-4 py-3 rounded-xl text-sm leading-relaxed ${
          isUser
            ? 'bg-plasma/10 border border-plasma/20 text-plasma rounded-tr-sm'
            : 'card text-slate-200 rounded-tl-sm'
        }`}>
          {isUser ? (
            <span>{msg.content}</span>
          ) : (
            <ReactMarkdown
              components={{
                code: ({ inline, children }) => inline
                  ? <code className="px-1 py-0.5 rounded text-xs bg-void-700 text-plasma font-mono-custom">{children}</code>
                  : <pre className="terminal my-2 overflow-x-auto"><code>{children}</code></pre>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                ul: ({ children }) => <ul className="list-disc pl-4 space-y-1 mb-2">{children}</ul>,
                li: ({ children }) => <li className="text-slate-300">{children}</li>,
                strong: ({ children }) => <strong className="text-white">{children}</strong>,
              }}
            >
              {msg.content}
            </ReactMarkdown>
          )}
        </div>

        {/* Suggested actions */}
        {msg.suggestedActions?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {msg.suggestedActions.map((action, i) => (
              <div key={i} className="terminal py-1.5 flex items-center gap-1.5">
                <Terminal className="w-2.5 h-2.5 shrink-0" />
                <code className="text-[10px]">{action}</code>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ChatbotPage() {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: "👋 Hi! I'm your AIOps AI Assistant powered by Claude. I can help you:\n\n- **Investigate incidents** and understand root causes\n- **Generate remediation steps** for common failures\n- **Explain Kubernetes, Docker, and Linux** operational issues\n- **Query your incident history** and patterns\n\nWhat would you like to know?",
      ts: Date.now(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [incidentId, setIncidentId] = useState('')
  const [incidents, setIncidents] = useState([])
  const bottomRef = useRef(null)

  useEffect(() => {
    incidentsAPI.list({ page_size: 10 }).then(r => setIncidents(r.data.incidents)).catch(() => {})
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = async (text) => {
    const userMsg = text || input.trim()
    if (!userMsg || loading) return
    setInput('')

    const userEntry = { role: 'user', content: userMsg, ts: Date.now() }
    setMessages(prev => [...prev, userEntry])
    setLoading(true)

    try {
      const history = messages
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role, content: m.content }))

      const res = await chatbotAPI.chat({
        message: userMsg,
        conversation_history: history,
        incident_id: incidentId ? Number(incidentId) : null,
      })

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: res.data.response,
        suggestedActions: res.data.suggested_actions,
        ts: Date.now(),
      }])
    } catch (err) {
      const errMsg = err.response?.status === 401
        ? 'Authentication error. Please log in again.'
        : 'Failed to get response. Check your API key in settings.'
      setMessages(prev => [...prev, { role: 'assistant', content: `⚠️ ${errMsg}`, ts: Date.now() }])
    } finally {
      setLoading(false)
    }
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  const clearChat = () => {
    setMessages([{
      role: 'assistant',
      content: "Chat cleared. How can I help you?",
      ts: Date.now(),
    }])
  }

  return (
    <div className="flex flex-col h-full p-6 gap-4 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ background: 'linear-gradient(135deg, rgba(187,134,252,0.2), rgba(0,212,255,0.1))', border: '1px solid rgba(187,134,252,0.3)' }}>
            <Bot className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-display font-semibold text-white">AI Ops Assistant</h2>
            <p className="text-xs text-slate-500">Powered by Claude · Ask anything about your incidents</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Incident context */}
          <select value={incidentId} onChange={e => setIncidentId(e.target.value)}
            className="input-field text-xs w-52">
            <option value="">No incident context</option>
            {incidents.map(i => (
              <option key={i.id} value={i.id}>
                #{i.id} — {i.title?.slice(0, 30)}
              </option>
            ))}
          </select>
          <button onClick={clearChat} className="btn-ghost text-xs flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" />
            Clear
          </button>
        </div>
      </div>

      {/* Context badge */}
      {incidentId && (
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
             style={{ background: 'rgba(0,212,255,0.06)', border: '1px solid rgba(0,212,255,0.2)' }}>
          <Zap className="w-3.5 h-3.5 text-plasma" />
          <span className="text-slate-300">Context: Incident #{incidentId}</span>
          <button onClick={() => setIncidentId('')} className="ml-auto text-slate-500 hover:text-slate-300">✕</button>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0 pr-1">
        {messages.map((msg, i) => <MessageBubble key={i} msg={msg} />)}

        {loading && (
          <div className="flex gap-3 animate-in">
            <div className="w-8 h-8 rounded-lg bg-violet/10 border border-violet/20 flex items-center justify-center">
              <Bot className="w-4 h-4 text-violet-400" />
            </div>
            <div className="card px-4 py-3 flex items-center gap-2">
              <div className="flex gap-1">
                {[0, 1, 2].map(i => (
                  <div key={i} className="w-1.5 h-1.5 rounded-full bg-violet-400"
                       style={{ animation: `pulse 1s ease-in-out ${i * 0.2}s infinite` }} />
                ))}
              </div>
              <span className="text-xs text-slate-500">Claude is thinking...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Starters */}
      {messages.length <= 1 && (
        <div className="shrink-0 grid grid-cols-2 md:grid-cols-3 gap-2">
          {STARTERS.map((s, i) => (
            <button key={i} onClick={() => sendMessage(s)}
              className="text-left px-3 py-2.5 rounded-lg text-xs text-slate-400 hover:text-slate-200 transition-all hover:border-plasma/30"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="shrink-0 flex gap-2">
        <div className="flex-1 relative">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
            placeholder="Ask about incidents, remediation steps, or operational issues..."
            className="input-field resize-none py-2.5 pr-10 text-sm"
            style={{ minHeight: '42px', maxHeight: '120px' }}
          />
          <div className="absolute right-3 bottom-2.5 text-[10px] text-slate-600">
            ↵ send
          </div>
        </div>
        <button onClick={() => sendMessage()} disabled={!input.trim() || loading}
          className="btn-primary px-4 flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
