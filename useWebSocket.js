/**
 * WebSocket Hook
 * Real-time connection to platform events (incidents, logs, alerts).
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

const WS_URL = import.meta.env.VITE_WS_URL || 
  (window.location.protocol === 'https:' ? 'wss://' : 'ws://') + 
  window.location.host + '/ws/events'

export function useWebSocket() {
  const ws = useRef(null)
  const [connected, setConnected] = useState(false)
  const [lastEvent, setLastEvent] = useState(null)
  const reconnectTimer = useRef(null)
  const mountedRef = useRef(true)

  const connect = useCallback(() => {
    if (!mountedRef.current) return
    
    const token = localStorage.getItem('token')
    if (!token) return

    try {
      ws.current = new WebSocket(`${WS_URL}?token=${token}`)

      ws.current.onopen = () => {
        setConnected(true)
        // Start ping loop
        ws.current._pingInterval = setInterval(() => {
          if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify({ type: 'ping' }))
          }
        }, 25000)
      }

      ws.current.onmessage = (e) => {
        try {
          const data = JSON.parse(e.data)
          if (data.type === 'pong' || data.type === 'heartbeat') return
          
          setLastEvent(data)

          if (data.type === 'new_incident') {
            const sevColor = data.severity === 'critical' ? '🔴' :
                             data.severity === 'high' ? '🟠' :
                             data.severity === 'medium' ? '🟡' : '🟢'
            toast(`${sevColor} New Incident: ${data.title}`, {
              duration: 6000,
              style: {
                background: '#0a1220',
                color: '#e2e8f0',
                border: '1px solid rgba(255,107,107,0.3)',
              },
            })
          }
        } catch {}
      }

      ws.current.onclose = () => {
        setConnected(false)
        clearInterval(ws.current?._pingInterval)
        if (mountedRef.current) {
          reconnectTimer.current = setTimeout(connect, 5000)
        }
      }

      ws.current.onerror = () => {
        ws.current?.close()
      }
    } catch (e) {
      console.warn('WebSocket connection failed:', e)
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    connect()
    return () => {
      mountedRef.current = false
      clearTimeout(reconnectTimer.current)
      clearInterval(ws.current?._pingInterval)
      ws.current?.close()
    }
  }, [connect])

  return { connected, lastEvent }
}
