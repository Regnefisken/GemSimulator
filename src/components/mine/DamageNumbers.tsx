export type DamageFloater = {
  id: number
  /** Negativ skade — vises som -X */
  value?: number
  left: string
  top: string
  isCrit?: boolean
  /** Valgfri tekst (fx pickup eller systembesked) */
  text?: string
  /** Tekstfarve — fallback til skade-farver */
  color?: string
}

type Props = { items: DamageFloater[] }

export default function DamageNumbers({ items }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-[55]">
      {items.map((it) => (
        <span
          key={it.id}
          className={[
            'absolute font-bold tabular-nums drop-shadow-lg animate-damage-float max-w-[min(220px,70vw)] text-center leading-tight',
            it.text != null
              ? 'text-base sm:text-lg'
              : it.isCrit
                ? 'text-yellow-200 text-2xl sm:text-3xl tracking-wide'
                : 'text-amber-300 text-lg sm:text-xl',
          ].join(' ')}
          style={{
            left: it.left,
            top: it.top,
            color: it.color,
          }}
        >
          {it.text != null
            ? it.text
            : it.isCrit
              ? `⚡ KRITISK! -${it.value ?? 0}`
              : `-${it.value ?? 0}`}
        </span>
      ))}
    </div>
  )
}
