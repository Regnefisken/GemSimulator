type Props = { striking: boolean }

export default function PickaxeOverlay({ striking }: Props) {
  return (
    <div className="pointer-events-none absolute inset-0 flex items-end justify-end p-3 sm:p-6 pb-10 sm:pb-14">
      <svg
        className={`w-16 h-16 sm:w-24 sm:h-24 text-slate-200 drop-shadow-2xl origin-bottom-right ${striking ? 'animate-pickaxe-strike' : ''}`}
        viewBox="0 0 64 64"
        fill="currentColor"
        aria-hidden
      >
        <path d="M44 6 L52 8 L48 18 L42 16 Z" className="text-slate-400" />
        <path d="M38 14 L48 18 L30 52 L22 48 Z" className="text-slate-300" />
        <path d="M22 48 L30 52 L18 58 L14 50 Z" className="text-amber-900/90" />
        <path d="M14 50 L18 58 L8 62 L6 54 Z" className="text-amber-950" />
      </svg>
    </div>
  )
}
