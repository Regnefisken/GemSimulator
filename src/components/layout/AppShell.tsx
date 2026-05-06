import type { Dispatch, ReactNode } from 'react'
import type { GameState } from '../../types'
import type { Action } from '../../lib/gameState'
import LevelBadge from './LevelBadge'
import TabBar, { type Tab } from './TabBar'

type Props = {
  state: GameState
  dispatch: Dispatch<Action>
  tab: Tab
  onTabChange: (tab: Tab) => void
  fullscreen?: boolean
  children: ReactNode
}

export default function AppShell({
  state,
  dispatch,
  tab,
  onTabChange,
  fullscreen = false,
  children,
}: Props) {
  if (fullscreen) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col bg-slate-900 text-slate-100 overflow-hidden">
        {children}
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-900 text-slate-100 pb-20 pt-14">
      <LevelBadge state={state} dispatch={dispatch} />
      <main className="flex-1 w-full max-w-6xl mx-auto px-3 sm:px-4 py-4 min-w-0">{children}</main>
      <TabBar active={tab} onChange={onTabChange} />
    </div>
  )
}
