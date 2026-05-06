import type { ReactNode } from 'react'
import type { ChestTier, RockType } from '../../types'

type TopProps = {
  className?: string
  onBack: () => void
  depth: number
  essenceCount: number
  areaLabel: string
}

export function HUDTopBar({ className = '', onBack, depth, essenceCount, areaLabel }: TopProps) {
  return (
    <div
      className={`flex items-center justify-between gap-3 px-3 py-2.5 bg-slate-950/80 border-b border-slate-700/90 backdrop-blur-md ${className}`}
    >
      <button
        type="button"
        onClick={onBack}
        className="pointer-events-auto text-sm text-amber-400 hover:text-amber-300 font-semibold min-h-[44px] px-2 rounded-lg hover:bg-slate-800/80"
      >
        ← Tilbage
      </button>
      <div className="flex flex-col items-center min-w-0">
        <span className="text-[11px] uppercase tracking-wider text-slate-500 truncate max-w-[60vw]">{areaLabel}</span>
        <span className="text-sm font-mono font-semibold text-slate-100">Dybde {depth}</span>
      </div>
      <div className="text-right pointer-events-auto">
        <span className="text-[11px] text-slate-500 block">Essenser</span>
        <span className="text-sm font-mono text-violet-200 font-semibold">{essenceCount}</span>
      </div>
    </div>
  )
}

type HpProps = {
  className?: string
  visible: boolean
  hp: number
  maxHp: number
}

export function HUDHpBar({ className = '', visible, hp, maxHp }: HpProps) {
  if (!visible) return null
  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0
  return (
    <div className={`px-3 py-1.5 bg-slate-950/65 ${className}`}>
      <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
        <span>Klippe</span>
        <span className="font-mono text-slate-400">
          {hp}/{maxHp}
        </span>
      </div>
      <div className="h-2 rounded-full bg-slate-900 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-amber-700 to-amber-400 transition-[width] duration-150"
          style={{ width: `${hpPct}%` }}
        />
      </div>
    </div>
  )
}

type BottomProps = {
  className?: string
  pickaxeName: string
  durability: number
  maxDurability: number
  dynamiteReady?: boolean
  matCount: number
  matCap: number
  rockType?: RockType
  chestTier?: ChestTier
  children?: ReactNode
}

const ROCK_TYPE_LABEL: Partial<Record<RockType, string>> = {
  hard: '🪨 Hård sten',
  rich: '💰 Rig åre',
  crystal: '💎 Krystalvene',
}

const ROCK_TYPE_CLASS: Partial<Record<RockType, string>> = {
  hard: 'bg-slate-700/60 border-slate-500/40 text-slate-300',
  rich: 'bg-amber-900/50 border-amber-600/40 text-amber-300',
  crystal: 'bg-cyan-900/50 border-cyan-600/40 text-cyan-300',
}

const CHEST_TIER_LABEL: Record<ChestTier, string> = {
  wood: '🪵 Trækiste',
  silver: '⚪ Sølvkiste',
  gold: '🌟 Guldkiste',
}

const CHEST_TIER_CLASS: Record<ChestTier, string> = {
  wood: 'bg-amber-950/55 border-amber-700/45 text-amber-200',
  silver: 'bg-slate-700/55 border-slate-400/40 text-slate-100',
  gold: 'bg-amber-900/55 border-amber-400/50 text-amber-200',
}

export function HUDBottomBar({
  className = '',
  pickaxeName,
  durability,
  maxDurability,
  dynamiteReady,
  matCount,
  matCap,
  rockType,
  chestTier,
  children,
}: BottomProps) {
  const durPct = maxDurability > 0 ? Math.max(0, (durability / maxDurability) * 100) : 0
  return (
    <div
      className={`flex flex-wrap items-end justify-between gap-3 px-3 py-2.5 bg-slate-950/80 border-t border-slate-700/90 backdrop-blur-md ${className}`}
    >
      <div className="space-y-2 min-w-[min(200px,45vw)]">
        {dynamiteReady && (
          <div className="text-[11px] font-semibold text-red-300 bg-red-950/50 border border-red-800/60 rounded-lg px-2 py-1">
            🧨 Dynamit klar — næste slag knuser klippen
          </div>
        )}
        {rockType && ROCK_TYPE_LABEL[rockType] && (
          <div
            className={`text-[11px] font-semibold border rounded-lg px-2 py-1 w-fit ${ROCK_TYPE_CLASS[rockType]}`}
          >
            {ROCK_TYPE_LABEL[rockType]}
          </div>
        )}
        {chestTier && (
          <div
            className={`text-[11px] font-semibold border rounded-lg px-2 py-1 w-fit ${CHEST_TIER_CLASS[chestTier]}`}
          >
            {CHEST_TIER_LABEL[chestTier]}
          </div>
        )}
        <div>
          <div className="text-xs text-slate-400 truncate max-w-[200px]" title={pickaxeName}>
            {pickaxeName}
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-0.5 mt-1">
            <span>Hakke</span>
            <span className="font-mono text-slate-400">
              {durability}/{maxDurability}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-slate-900 overflow-hidden">
            <div
              className={
                'h-full rounded-full transition-[width] duration-150 ' +
                (durability <= 0 ? 'bg-red-500' : durPct < 25 ? 'bg-orange-500' : 'bg-slate-400')
              }
              style={{ width: `${durPct}%` }}
            />
          </div>
        </div>
        <p className="text-[11px] text-slate-500">
          Lager (materialer):{' '}
          <span className="font-mono text-slate-200">
            {matCount}/{matCap}
          </span>
        </p>
      </div>
      <div className="pointer-events-auto shrink-0">{children}</div>
    </div>
  )
}
