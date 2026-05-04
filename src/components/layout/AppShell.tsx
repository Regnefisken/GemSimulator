import type { ReactNode } from 'react'
import type { GameState } from '../../types'
import LevelBadge from './LevelBadge'
import TabBar, { type Tab } from './TabBar'

type Props = {
  state: GameState
  tab: Tab
  onTabChange: (tab: Tab) => void
  children: ReactNode
}

export default function AppShell({ state, tab, onTabChange, children }: Props) {
  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 pb-20 pt-14">
      <LevelBadge state={state} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-4">{children}</main>
      <TabBar active={tab} onChange={onTabChange} />
    </div>
  )
}
