import { useState, type Dispatch } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import { isInActiveMineRun } from '../../lib/survival'
import PixelItemCard from '../PixelItemCard'
import ItemPreviewModal from './ItemPreviewModal'
import LoadoutCharacterStrip from './LoadoutCharacterStrip'

function CapacityLine({ used, max, label }: { used: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, (used / max) * 100) : 0
  return (
    <div className="text-xs text-slate-400 mb-4">
      <div className="flex justify-between gap-2">
        <span>{label}</span>
        <span className="font-mono text-slate-300">
          {used} / {max}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-slate-800 mt-1.5 overflow-hidden">
        <div
          className="h-full rounded-full bg-slate-500 transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

function armourBonusSubtitle(a: { bonuses: { hpMax?: number; manaMax?: number } }): string {
  const bits = [
    a.bonuses.hpMax ? `+${a.bonuses.hpMax} liv` : null,
    a.bonuses.manaMax ? `+${a.bonuses.manaMax} mana` : null,
  ].filter(Boolean)
  return bits.join(' · ') || 'Ingen bonus'
}

export default function ToolsInventoryTab({ state, dispatch }: { state: GameState; dispatch: Dispatch<Action> }) {
  const [previewId, setPreviewId] = useState<string | null>(null)
  const [previewKind, setPreviewKind] = useState<'pickaxe' | 'sword' | 'armour'>('pickaxe')
  const cap = state.inventoryCapacity.tools
  const used = state.pickaxes.length + state.swords.length + state.armours.length
  const previewPick = previewKind === 'pickaxe' ? state.pickaxes.find((p) => p.id === previewId) ?? null : null
  const previewSw = previewKind === 'sword' ? state.swords.find((s) => s.id === previewId) ?? null : null
  const previewArm = previewKind === 'armour' ? state.armours.find((a) => a.id === previewId) ?? null : null
  const previewWeapon = previewPick ?? previewSw
  const preview = previewWeapon ?? previewArm

  const inMineRun = isInActiveMineRun(state)

  return (
    <div>
      <LoadoutCharacterStrip state={state} />
      <CapacityLine used={used} max={cap} label="Værktøj (hakker + sværd + rustning)" />
      <h3 className="text-sm font-semibold text-slate-200 mb-2">Hakker</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {state.pickaxes.map((p) => (
          <PixelItemCard
            key={p.id}
            item={p.pixelItem}
            rasterIconSrc={p.menuIconSrc}
            label={p.name}
            subtitle={
              p.durability === 0
                ? '⚠️ Slidt op — reparér med kul i smedjen'
                : `${p.durability}/${p.maxDurability} · ${p.damage} skade`
            }
            highlighted={p.id === state.activePickaxeId}
            onClick={() => {
              setPreviewKind('pickaxe')
              setPreviewId(p.id)
            }}
          />
        ))}
      </div>

      <h3 className="text-sm font-semibold text-slate-200 mb-2">Sværd</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-6">
        {state.swords.map((s) => (
          <PixelItemCard
            key={s.id}
            item={s.pixelItem}
            rasterIconSrc={s.menuIconSrc}
            label={s.name}
            subtitle={
              s.durability === 0
                ? '⚠️ Slidt op — reparér med kul i smedjen'
                : `${s.durability}/${s.maxDurability} · ${s.damage} skade`
            }
            highlighted={s.id === state.activeSwordId}
            onClick={() => {
              setPreviewKind('sword')
              setPreviewId(s.id)
            }}
          />
        ))}
      </div>

      <h3 className="text-sm font-semibold text-slate-200 mb-2">Rustning</h3>
      <p className="text-xs text-slate-500 mb-2">
        Kun på overfladen/hub — ikke midt i aktiv mine-run (D35). Rustning er kun 2D-ikon; ingen model-skift.
        {inMineRun && (
          <span className="block mt-1 text-amber-400/95 font-medium">
            Du har et aktivt minebesøg: åbn lager fra kort/hub for at skifte rustning.
          </span>
        )}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {state.armours.map((a) => (
          <PixelItemCard
            key={a.id}
            item={a.pixelItem}
            label={a.name}
            subtitle={
              a.durability === 0
                ? '⚠️ Ødelagt — ingen bonus · reparér i smedjen'
                : `${armourBonusSubtitle(a)} · ${a.durability}/${a.maxDurability}`
            }
            highlighted={a.id === state.activeArmourId}
            onClick={() => {
              setPreviewKind('armour')
              setPreviewId(a.id)
            }}
          />
        ))}
      </div>

      {preview && previewKind !== 'armour' && previewWeapon && (
        <ItemPreviewModal
          open
          onClose={() => setPreviewId(null)}
          item={previewWeapon.pixelItem}
          rasterPreviewSrc={previewWeapon.menuIconSrc}
          title={previewWeapon.name}
          subtitleLines={[
            `Skade: ${previewWeapon.damage}`,
            `Holdbarhed: ${previewWeapon.durability} / ${previewWeapon.maxDurability}`,
            `Tier: ${previewWeapon.tier}`,
            previewKind === 'pickaxe'
              ? previewWeapon.id === state.activePickaxeId
                ? 'Status: Aktiv hakke i minen'
                : 'Status: Ikke valgt som aktiv hakke'
              : previewWeapon.id === state.activeSwordId
                ? 'Status: Aktivt sværd i minen'
                : 'Status: Ikke valgt som aktivt sværd',
          ]}
          footer={
            <div className="flex flex-col gap-3 w-full">
              {previewKind === 'pickaxe' && previewWeapon.id !== state.activePickaxeId ? (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_PICKAXE', id: previewWeapon.id })
                    setPreviewId(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
                >
                  Sæt som aktiv hakke
                </button>
              ) : previewKind === 'sword' && previewWeapon.id !== state.activeSwordId ? (
                <button
                  type="button"
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_SWORD', id: previewWeapon.id })
                    setPreviewId(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-semibold"
                >
                  Sæt som aktivt sværd
                </button>
              ) : (
                <div className="flex flex-col gap-2">
                  <span className="text-sm text-emerald-400 font-medium">
                    {previewKind === 'pickaxe' ? 'Aktiv hakke' : 'Aktivt sværd'}
                  </span>
                  {previewWeapon.durability < previewWeapon.maxDurability && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Gå til <strong className="text-amber-200/90">smedjen</strong> og brug reparationsbænken med{' '}
                      <strong className="text-amber-200/90">kul</strong>.
                    </p>
                  )}
                </div>
              )}
            </div>
          }
        />
      )}

      {previewArm && previewKind === 'armour' && (
        <ItemPreviewModal
          open
          onClose={() => setPreviewId(null)}
          item={previewArm.pixelItem}
          title={previewArm.name}
          subtitleLines={[
            armourBonusSubtitle(previewArm),
            `Holdbarhed: ${previewArm.durability} / ${previewArm.maxDurability}`,
            `Tier: ${previewArm.tier}`,
            previewArm.id === state.activeArmourId
              ? 'Status: Bærer denne rustning (bonus aktiv mens den holder)'
              : 'Status: Ikke påklædt',
          ]}
          footer={
            <div className="flex flex-col gap-3 w-full">
              {previewArm.id !== state.activeArmourId ? (
                <button
                  type="button"
                  disabled={inMineRun}
                  title={inMineRun ? 'Rustning kan ikke skiftes under aktiv mine-run' : undefined}
                  onClick={() => {
                    dispatch({ type: 'SET_ACTIVE_ARMOUR', id: previewArm.id })
                    setPreviewId(null)
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-600 hover:bg-slate-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold"
                >
                  Tag rustning på
                </button>
              ) : (
                <>
                  <span className="text-sm text-emerald-400 font-medium">Aktiv rustning</span>
                  <button
                    type="button"
                    disabled={inMineRun}
                    title={inMineRun ? 'Rustning kan ikke skiftes under aktiv mine-run' : undefined}
                    onClick={() => {
                      dispatch({ type: 'SET_ACTIVE_ARMOUR', id: null })
                      setPreviewId(null)
                    }}
                    className="px-4 py-2 rounded-xl border border-slate-600 text-slate-200 text-sm font-semibold hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Afmonter
                  </button>
                  {previewArm.durability < previewArm.maxDurability && (
                    <p className="text-xs text-slate-400 leading-relaxed">
                      Reparér i <strong className="text-amber-200/90">smedjen</strong> med{' '}
                      <strong className="text-amber-200/90">kul</strong>.
                    </p>
                  )}
                </>
              )}
            </div>
          }
        />
      )}
    </div>
  )
}
