export type DamageFloater = {
  id: number
  value: number
  left: string
  top: string
  isCrit?: boolean
}

type Props = { items: DamageFloater[] }

export default function DamageNumbers({ items }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-10">
      {items.map((it) => (
        <span
          key={it.id}
          className={[
            'absolute font-bold tabular-nums drop-shadow-lg animate-damage-float',
            it.isCrit
              ? 'text-yellow-200 text-2xl sm:text-3xl tracking-wide'
              : 'text-amber-300 text-lg sm:text-xl',
          ].join(' ')}
          style={{ left: it.left, top: it.top }}
        >
          {it.isCrit ? `⚡ KRITISK! -${it.value}` : `-${it.value}`}
        </span>
      ))}
    </div>
  )
}
