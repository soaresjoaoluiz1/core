// Toast provider global — substitui alert() nativo do browser
// Uso: const { toast } = useToast(); toast('mensagem', 'success'|'error'|'info')
import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'

type ToastKind = 'success' | 'error' | 'info'
interface ToastItem { id: number; kind: ToastKind; message: string }
interface ToastCtx { toast: (message: string, kind?: ToastKind, durationMs?: number) => void }

const Ctx = createContext<ToastCtx>({ toast: () => {} })

export function useToast() { return useContext(Ctx) }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const toast = useCallback((message: string, kind: ToastKind = 'info', durationMs = 4500) => {
    const id = Date.now() + Math.random()
    setItems(prev => [...prev, { id, kind, message }])
    if (durationMs > 0) {
      setTimeout(() => setItems(prev => prev.filter(t => t.id !== id)), durationMs)
    }
  }, [])

  const remove = (id: number) => setItems(prev => prev.filter(t => t.id !== id))

  return (
    <Ctx.Provider value={{ toast }}>
      {children}
      <div style={{
        position: 'fixed', bottom: 20, right: 20, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 380, pointerEvents: 'none',
      }}>
        {items.map(t => {
          const isSuccess = t.kind === 'success'
          const isError = t.kind === 'error'
          const bg = isSuccess ? 'rgba(52,199,89,0.15)' : isError ? 'rgba(239,68,68,0.15)' : 'rgba(59,130,246,0.15)'
          const border = isSuccess ? 'rgba(52,199,89,0.5)' : isError ? 'rgba(239,68,68,0.5)' : 'rgba(59,130,246,0.5)'
          const color = isSuccess ? '#34c759' : isError ? '#ef4444' : '#5dade2'
          const Icon = isSuccess ? CheckCircle2 : isError ? XCircle : Info
          return (
            <div
              key={t.id}
              role="alert"
              style={{
                pointerEvents: 'auto',
                display: 'flex', alignItems: 'flex-start', gap: 10,
                padding: '12px 14px',
                background: `linear-gradient(180deg, rgba(20,17,32,0.98), rgba(15,12,26,0.98))`,
                border: `1px solid ${border}`,
                borderLeft: `3px solid ${color}`,
                borderRadius: 10,
                boxShadow: '0 20px 40px -12px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.03)',
                color: '#e8e6ee', fontSize: 13, lineHeight: 1.45,
                fontFamily: 'inherit', animation: 'toastIn .18s cubic-bezier(.2,.7,.2,1) both',
                minWidth: 260, backdropFilter: 'blur(8px)',
              }}
            >
              <div style={{ width: 20, height: 20, borderRadius: '50%', background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <Icon size={13} style={{ color }} />
              </div>
              <span style={{ flex: 1, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{t.message}</span>
              <button onClick={() => remove(t.id)} title="Fechar" style={{ background: 'transparent', border: 'none', color: '#7a8194', cursor: 'pointer', padding: 2, borderRadius: 3, flexShrink: 0 }}>
                <X size={13} />
              </button>
            </div>
          )
        })}
      </div>
      <style>{`
        @keyframes toastIn {
          from { opacity: 0; transform: translateY(6px) scale(.98) }
          to { opacity: 1; transform: none }
        }
      `}</style>
    </Ctx.Provider>
  )
}
