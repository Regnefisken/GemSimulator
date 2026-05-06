import { useEffect, useMemo, useState } from 'react'
import type { Dispatch } from 'react'
import type { Gem, Jewelry } from '../../types'
import type { Action } from '../../lib/gameState'
import {
  blueprintIngotRequirements,
  primaryMetalFromJewelryIngots,
  resolveGemsForJewelryPreview,
} from '../../data/jewelry'
import { findBlueprint } from '../../data/blueprints'
import { METALS } from '../../data/metals'
import PixelItemCard from '../PixelItemCard'
import JewelryViewer from './JewelryViewer'
import VoxelScene from '../VoxelScene'

type TabId = '3d' | '2d' | 'stats'

type Props = {
  jewelry: Jewelry | null
  open: boolean
  gems: Gem[]
  dispatch: Dispatch<Action>
  onClose: () => void
}

export default function JewelryDetailModal({ jewelry, open, gems, dispatch, onClose }: Props) {
  const [tab, setTab] = useState<TabId>('3d')

  useEffect(() => {
    if (!open) return
    setTab('3d')
  }, [open, jewelry?.id])

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

  const bp = jewelry ? findBlueprint(jewelry.blueprintId) : undefined
  const rimMetal = useMemo(
    () => (jewelry ? primaryMetalFromJewelryIngots(jewelry.ingotsUsed) : 'Kobber'),
    [jewelry],
  )
  const previewGems = useMemo(
    () => (jewelry ? resolveGemsForJewelryPreview(jewelry, gems) : []),
    [jewelry, gems],
  )

  if (!open || !jewelry) return null

  const piece = jewelry
  const gemLine =
    piece.gemsUsed.length > 0 ? piece.gemsUsed.map((x) => x.name).join(' · ') : piece.gemUsed.name

  function sell() {
    dispatch({ type: 'SELL_JEWELRY', id: piece.id })
    onClose()
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="jewelry-detail-title"
    >
      <div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl flex flex-col gap-4 p-4 md:p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 min-w-[44px] min-h-[44px] rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-medium"
        >
          Luk
        </button>

        <h2 id="jewelry-detail-title" className="text-xl font-bold text-slate-100 pr-14">
          {piece.name}
        </h2>
        <p className="text-sm text-slate-400 -mt-2">Sten: {gemLine}</p>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['3d', '3D'],
              ['2d', '2D'],
              ['stats', 'Statistik'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id as TabId)}
              className={`min-h-[40px] px-4 rounded-lg text-sm font-semibold ${
                tab === id ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-slate-600 bg-slate-950 min-h-[240px] flex items-center justify-center overflow-hidden p-2">
          {tab === '2d' && (
            <PixelItemCard item={piece.pixelItem} label={piece.name} subtitle={bp?.name} rareGlow />
          )}
          {tab === '3d' && piece.voxelData && (
            <div className="w-full h-[300px] min-h-[220px]">
              <VoxelScene
                mode="3d"
                voxel3d={piece.voxelData}
                className="w-full h-full"
                cameraTilt={0.45}
                canvasStyle={{ width: '100%', height: '100%' }}
              />
            </div>
          )}
          {tab === '3d' && !piece.voxelData && previewGems.length > 0 && (
            <div className="w-full h-[300px] min-h-[220px]">
              <JewelryViewer
                blueprintId={piece.blueprintId}
                gems={previewGems}
                rimMetal={rimMetal}
                className="w-full h-full"
              />
            </div>
          )}
          {tab === '3d' && !piece.voxelData && previewGems.length === 0 && (
            <p className="text-slate-500 text-sm px-4 text-center">Ingen gem-data til 3D-preview.</p>
          )}
          {tab === 'stats' && (
            <div className="w-full text-sm text-slate-300 space-y-3 p-2 text-left">
              {bp && (
                <>
                  <p>
                    <span className="text-slate-500">Blueprint:</span> {bp.icon} {bp.name}
                  </p>
                  <p className="text-slate-500 text-xs">{bp.description}</p>
                  <p>
                    <span className="text-slate-500">Forbrugt metal:</span>{' '}
                    {piece.ingotsUsed.length > 0
                      ? piece.ingotsUsed
                          .map((r) => `${r.quantity}× ${METALS[r.metalName]?.name ?? r.metalName}`)
                          .join(' · ')
                      : bp
                        ? blueprintIngotRequirements(bp)
                            .map(({ metalName, quantity }) => `${quantity}× ${METALS[metalName].name}`)
                            .join(' · ')
                        : '—'}
                  </p>
                </>
              )}
              {!bp && <p className="text-slate-500">Ukendt blueprint-id: {piece.blueprintId}</p>}
              <p>
                <span className="text-slate-500">Salgsværdi:</span>{' '}
                <span className="text-amber-200 font-semibold">{piece.goldValue} g</span> · +
                {piece.reputationValue} omdømme
              </p>
              <p className="text-slate-500 text-xs">Lavet {piece.timestamp}</p>
            </div>
          )}
        </div>

        <p className="text-xs text-slate-500">Træk i 3D-visning for at rotere.</p>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={sell}
            className="min-h-[48px] px-6 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-sm"
          >
            Sælg på Adelsmarkedet (+15 XP)
          </button>
        </div>
      </div>
    </div>
  )
}
