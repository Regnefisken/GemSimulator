import { useState } from 'react'
import type { Dispatch } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import PixelItemCard from '../PixelItemCard'
import JewelryDetailModal from '../jewelry/JewelryDetailModal'

export default function JewelryInventoryTab({
  state,
  dispatch,
}: {
  state: GameState
  dispatch: Dispatch<Action>
}) {
  const [openId, setOpenId] = useState<string | null>(null)
  const selected = openId ? state.jewelry.find((j) => j.id === openId) ?? null : null

  return (
    <div>
      {state.jewelry.length === 0 ? (
        <p className="text-slate-500 text-sm">Ingen smykker endnu — smed i smykkeværkstedet.</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          {state.jewelry.map((j) => {
            const gemLine =
              j.gemsUsed.length > 0 ? j.gemsUsed.map((x) => x.name).join(' · ') : j.gemUsed.name
            return (
              <li key={j.id}>
                <PixelItemCard
                  item={j.pixelItem}
                  label={j.name}
                  subtitle={`Sten: ${gemLine}`}
                  rareGlow
                  onClick={() => setOpenId(j.id)}
                />
                <p className="text-[11px] text-slate-500 mt-2 text-center">
                  Tryk for detaljer · {j.goldValue} g
                </p>
              </li>
            )
          })}
        </ul>
      )}
      <JewelryDetailModal
        jewelry={selected}
        open={selected !== null}
        gems={state.gems}
        dispatch={dispatch}
        onClose={() => setOpenId(null)}
      />
    </div>
  )
}
