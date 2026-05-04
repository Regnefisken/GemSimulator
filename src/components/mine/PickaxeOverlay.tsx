type Props = { striking: boolean }

/** ⛏️ med pivot ved håndtag (bund) — placeret ved klippens midte. */
export default function PickaxeOverlay({ striking }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 z-[5]">
      <div className="absolute left-1/2 top-[40%] -translate-x-1/2 w-0 h-0" aria-hidden>
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2">
          <span
            className={`block text-5xl sm:text-6xl leading-none select-none drop-shadow-[0_4px_0_rgba(0,0,0,0.45)] origin-bottom ${
              striking ? 'animate-pickaxe-strike' : 'rotate-[42deg]'
            }`}
          >
            ⛏️
          </span>
        </div>
      </div>
    </div>
  )
}
