import React, { createContext, useContext, useState, useCallback } from 'react'

interface Toast {
  id: number
  message: string
  type: 'success' | 'error' | 'info'
}

interface NotifCtx {
  notify: (message: string, type?: Toast['type']) => void
}

const Context = createContext<NotifCtx>({ notify: () => {} })

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const notify = useCallback((message: string, type: Toast['type'] = 'info') => {
    const id = Date.now() + Math.random()
    setToasts((prev) => [...prev, { id, message, type }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 4000)
  }, [])

  return (
    <Context.Provider value={{ notify }}>
      {children}
      <div style={{ position: 'fixed', top: 16, right: 16, zIndex: 1000, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {toasts.map((t) => (
          <div
            key={t.id}
            style={{
              padding: '10px 16px', borderRadius: 10, fontSize: 13, fontWeight: 500,
              background: t.type === 'error' ? 'rgba(239,68,68,0.12)' : t.type === 'success' ? 'rgba(34,197,94,0.12)' : 'var(--rift-surface-raised)',
              color: t.type === 'error' ? 'var(--rift-danger)' : t.type === 'success' ? 'var(--rift-positive)' : 'var(--rift-text)',
              border: `1px solid ${t.type === 'error' ? 'rgba(239,68,68,0.2)' : t.type === 'success' ? 'rgba(34,197,94,0.2)' : 'var(--rift-border)'}`,
              backdropFilter: 'blur(8px)',
              animation: 'slideIn 0.2s ease',
            }}
          >
            {t.message}
          </div>
        ))}
      </div>
    </Context.Provider>
  )
}

export const useNotify = () => useContext(Context).notify
