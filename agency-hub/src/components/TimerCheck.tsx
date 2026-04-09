import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiFetch } from '../lib/api'

const CHECK_INTERVAL = 300 // seconds (5min for testing, change to 3600 for production)

export default function TimerCheck() {
  const [activeTimer, setActiveTimer] = useState<any>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showPopup, setShowPopup] = useState(false)
  const lastCheckRef = useRef(0)
  const navigate = useNavigate()

  // Poll for active timers every 30 seconds
  useEffect(() => {
    const poll = () => {
      apiFetch<{ timers: any[] }>('/api/my-timers')
        .then(d => {
          if (d.timers.length > 0) setActiveTimer(d.timers[0])
          else { setActiveTimer(null); lastCheckRef.current = 0 }
        })
        .catch(() => {})
    }
    poll()
    const interval = setInterval(poll, 30000)
    return () => clearInterval(interval)
  }, [])

  // Tick elapsed + check interval
  useEffect(() => {
    if (!activeTimer) return
    const interval = setInterval(() => {
      const startedAt = new Date(activeTimer.started_at + '-03:00').getTime()
      const el = Math.max(0, Math.floor((Date.now() - startedAt) / 1000))
      setElapsed(el)
      const currentPeriod = Math.floor(el / CHECK_INTERVAL)
      if (currentPeriod > 0 && currentPeriod > lastCheckRef.current) {
        lastCheckRef.current = currentPeriod
        setShowPopup(true)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [activeTimer])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600); const m = Math.floor((seconds % 3600) / 60); const s = seconds % 60
    return h > 0 ? `${h}h ${m}m ${s}s` : m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const handleYes = () => setShowPopup(false)

  const handleNo = async () => {
    setShowPopup(false)
    if (activeTimer) {
      try {
        await apiFetch(`/api/tasks/${activeTimer.task_id}/time/stop`, { method: 'POST', body: JSON.stringify({}) })
        await apiFetch(`/api/tasks/${activeTimer.task_id}/stage`, { method: 'PUT', body: JSON.stringify({ stage: 'backlog' }) })
      } catch {}
      setActiveTimer(null); lastCheckRef.current = 0
    }
  }

  if (!showPopup) return null

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#16102A', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 16, padding: '32px 28px', maxWidth: 380, width: '90%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>&#9202;</div>
        <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Ainda esta produzindo?</h2>
        <p style={{ color: '#9B96B0', fontSize: 14, marginBottom: 6 }}>Timer ativo ha <strong style={{ color: '#FFB300' }}>{formatTime(elapsed)}</strong></p>
        <p style={{ color: '#6B6580', fontSize: 12, marginBottom: 20 }}>"{activeTimer?.task_title}"</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={handleYes} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #FFB300, #FFAA83)', color: '#0A0118', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minWidth: 120 }}>Sim, continuar</button>
          <button onClick={handleNo} style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: '#FF6B6B', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', minWidth: 120 }}>Nao, parar</button>
        </div>
      </div>
    </div>
  )
}
