export type Tab = 'map' | 'inventory' | 'shop'

type Props = {
  active: Tab
  onChange: (tab: Tab) => void
}

const ITEMS: { id: Tab; label: string; icon: string }[] = [
  { id: 'map', label: 'Kort', icon: '🗺️' },
  { id: 'inventory', label: 'Lager', icon: '🎒' },
  { id: 'shop', label: 'Butik', icon: '🪙' },
]

export default function TabBar({ active, onChange }: Props) {
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-700 bg-slate-950/95 backdrop-blur-md min-h-16 flex items-stretch justify-around px-2 pb-[max(0.5rem,env(safe-area-inset-bottom,0px))]"
      aria-label="Hovednavigation"
    >
      {ITEMS.map((item) => {
        const isActive = active === item.id
        return (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange(item.id)}
            className={
              'flex flex-1 flex-col items-center justify-center gap-0.5 min-h-16 min-w-[44px] py-2 text-xs font-medium transition-colors ' +
              (isActive ? 'text-amber-400' : 'text-slate-500 hover:text-slate-300')
            }
          >
            <span className="text-xl leading-none" aria-hidden>
              {item.icon}
            </span>
            <span>{item.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
