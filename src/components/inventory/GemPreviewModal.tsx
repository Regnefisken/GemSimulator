import { useEffect, useRef } from 'react'
import type { Gem } from '../../types'
import GemViewer from '../GemViewer'
import type { VoxelSceneHandle } from '../VoxelScene'

type Props = {
  gem: Gem | null
  open: boolean
  onClose: () => void
}

export default function GemPreviewModal({ gem, open, onClose }: Props) {
  const voxelRef = useRef<VoxelSceneHandle>(null)
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
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !gem) return null

  const g = gem

  function download() {
    if (!voxelRef.current) return
    const url = voxelRef.current.toDataURL()
    const a = document.createElement('a')
    let filename = g.name.replace(/ /g, '_')
    const firstMagic = g.magicProperties[0]
    if (firstMagic) filename += `_${firstMagic.name}`
    a.download = `${filename}_${g.timestamp}.png`
    a.href = url
    a.click()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div ref={wrapRef} className="relative w-full max-w-lg py-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-0 right-0 z-10 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
        >
          Luk
        </button>
        <GemViewer gem={g} voxelRef={voxelRef} onGenerate={() => {}} onDownload={download} compact />
      </div>
    </div>
  )
}
