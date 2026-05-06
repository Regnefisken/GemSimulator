import VoxelScene from '../VoxelScene'
import type { MineDrop } from '../../gem/mining'

type Props =
  | {
      kind: 'item'
      drop: MineDrop
      disabled: boolean
      disabledReason?: string
      onTake: () => void
    }
  | {
      kind: 'gold'
      goldAmount: number
      disabled: boolean
      disabledReason?: string
      onTake: () => void
    }
  | {
      kind: 'blueprint'
      name: string
      disabled: boolean
      disabledReason?: string
      onTake: () => void
    }

export default function ChestLootCard(props: Props) {
  const common =
    'rounded-xl border border-slate-600 bg-slate-900/90 p-3 flex flex-col gap-2 min-h-[120px] min-w-[120px] max-w-[160px] hover:border-amber-600/50 transition-colors shadow-lg'

  if (props.kind === 'gold') {
    return (
      <button
        type="button"
        disabled={props.disabled || props.goldAmount <= 0}
        onClick={props.onTake}
        className={common + ' text-left'}
      >
        <span className="text-2xl">🪙</span>
        <span className="text-sm font-semibold text-amber-200">{props.goldAmount} guld</span>
        {props.disabledReason && <span className="text-[11px] text-amber-400/90">{props.disabledReason}</span>}
      </button>
    )
  }

  if (props.kind === 'blueprint') {
    return (
      <button type="button" disabled={props.disabled} onClick={props.onTake} className={common + ' text-left'}>
        <span className="text-xl">📜</span>
        <span className="text-xs font-semibold text-slate-100 leading-snug">{props.name}</span>
        {props.disabledReason && <span className="text-[11px] text-slate-400">{props.disabledReason}</span>}
      </button>
    )
  }

  const drop = props.drop
  let title = 'Genstand'
  let viz: { data: string[]; colorMap: Record<string, string> } | null = null

  if (drop.kind === 'ore') {
    title = `${drop.ore.metalName} malm`
    viz = drop.ore.pixelItem
  } else if (drop.kind === 'nugget') {
    title = `${drop.nugget.metalName} klump`
    viz = drop.nugget.pixelItem
  } else if (drop.kind === 'rough-stone') {
    title = 'Rå klippe'
    viz = drop.stone.pixelItem
  } else if (drop.kind === 'gem') {
    title = drop.gem.name
    viz = { data: drop.gem.data, colorMap: drop.gem.colorMap }
  }

  return (
    <button type="button" disabled={props.disabled} onClick={props.onTake} className={common + ' items-center'}>
      {viz && (
        <div className="w-[72px] h-[72px] mx-auto overflow-hidden rounded-lg bg-slate-950">
          <VoxelScene data={viz.data} colorMap={viz.colorMap} className="!block !max-w-none scale-90" />
        </div>
      )}
      <span className="text-[11px] font-semibold text-slate-200 text-center leading-tight">{title}</span>
      {props.disabledReason && <span className="text-[10px] text-slate-400">{props.disabledReason}</span>}
    </button>
  )
}
