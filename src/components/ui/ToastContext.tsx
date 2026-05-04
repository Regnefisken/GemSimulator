import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'gold'

type ToastItem = { id: number; message: string; tone: ToastTone; durationMs: number }

type ToastContextValue = {
  showToast: (message: string, tone?: ToastTone, durationMs?: number) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const v = useContext(ToastContext)
  if (!v) throw new Error('useToast kræver ToastProvider')
  return v
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const showToast = useCallback((message: string, tone: ToastTone = 'info', durationMs = 3400) => {
    const id = Date.now() + Math.random()
    setItems((prev) => [...prev.slice(-4), { id, message, tone, durationMs }])
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id))
    }, durationMs)
  }, [])

  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="fixed top-14 left-1/2 -translate-x-1/2 z-[88] flex flex-col items-center gap-2 w-[min(92vw,380px)] pointer-events-none px-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={
              'w-full rounded-xl border px-3 py-2.5 text-sm font-medium text-center shadow-lg backdrop-blur-sm ' +
              (t.tone === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-100'
                : t.tone === 'gold'
                  ? 'bg-amber-950/90 border-amber-500/50 text-amber-100'
                  : 'bg-slate-900/95 border-slate-600/60 text-slate-100')
            }
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
