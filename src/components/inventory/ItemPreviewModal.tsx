import { useEffect, useRef, type ReactNode } from 'react'
import type { PixelItem } from '../../types'
import PixelItemVoxelScene from '../PixelItemVoxelScene'

type Props = {
  open: boolean
  onClose: () => void
  item: PixelItem
  title: string
  subtitleLines?: string[]
  footer?: ReactNode
}

export default function ItemPreviewModal({ open, onClose, item, title, subtitleLines, footer }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const el = wrapRef.current
    if (!el) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open) return null

  const hasPixels = item.data.length > 0

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-preview-title"
    >
      <div
        ref={wrapRef}
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl flex flex-col md:flex-row gap-4 p-4 md:p-6"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
        >
          Luk
        </button>

        <div className="flex-1 flex flex-col items-center min-w-0">
          <div className="w-full max-w-[min(100%,400px)] aspect-square min-h-[220px] rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
            {hasPixels ? (
              <PixelItemVoxelScene
                item={item}
                className="w-full h-full"
                canvasStyle={{ width: '100%', height: '100%' }}
                cameraTilt={0.35}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">Intet billede</div>
            )}
          </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 pt-8 md:pt-2">
          <h2 id="item-preview-title" className="text-xl font-bold text-slate-100 pr-12">
            {title}
          </h2>
          {subtitleLines && subtitleLines.length > 0 && (
            <ul className="mt-3 space-y-1 text-sm text-slate-400">
              {subtitleLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
          <p className="mt-4 text-xs text-slate-500">Træk for at rotere · slip for auto-rotation</p>
          {footer && <div className="mt-6 flex flex-wrap gap-2">{footer}</div>}
        </div>
      </div>
    </div>
  )
}
