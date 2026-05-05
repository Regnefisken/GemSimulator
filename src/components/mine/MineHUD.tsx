import type { ChestTier, RockType } from '../../types'

type Props = {
  depth: number
  hp: number
  maxHp: number
  pickaxeName: string
  durability: number
  maxDurability: number
  dynamiteReady?: boolean
  rockType?: RockType
  chestTier?: ChestTier
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

export default function MineHUD({
  depth,
  hp,
  maxHp,
  pickaxeName,
  durability,
  maxDurability,
  dynamiteReady,
  rockType,
  chestTier,
}: Props) {
  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0
  const durPct = maxDurability > 0 ? Math.max(0, (durability / maxDurability) * 100) : 0

  return (
    <div className="rounded-xl border border-slate-700 bg-slate-800/80 px-3 py-2.5 space-y-2 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-slate-400">
          Dybde <span className="text-slate-100 font-mono font-semibold">{depth}</span>
        </span>
        <span className="text-slate-400 truncate max-w-[55%] text-right" title={pickaxeName}>
          {pickaxeName}
        </span>
      </div>
      {dynamiteReady && (
        <div className="text-[11px] font-semibold text-red-300 bg-red-950/50 border border-red-800/60 rounded-lg px-2 py-1">
          🧨 Dynamit klar — næste slag knuser klippen
        </div>
      )}
      {rockType && ROCK_TYPE_LABEL[rockType] && (
        <div
          className={`text-[11px] font-semibold border rounded-lg px-2 py-1 ${ROCK_TYPE_CLASS[rockType]}`}
        >
          {ROCK_TYPE_LABEL[rockType]}
        </div>
      )}
      {chestTier && (
        <div
          className={`text-[11px] font-semibold border rounded-lg px-2 py-1 ${CHEST_TIER_CLASS[chestTier]}`}
        >
          {CHEST_TIER_LABEL[chestTier]}
        </div>
      )}
      <div>
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
      <div>
        <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 mb-0.5">
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
    </div>
  )
}
