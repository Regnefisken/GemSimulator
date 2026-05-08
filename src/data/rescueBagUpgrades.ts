/**
 * D48: redningspose-kapacitet under run (Fase 2).
 * Rækker sorteres stigende efter `rescueBagCapacity` (mål-værdi efter køb).
 */
export type RescueBagUpgradeRow = {
  id: string
  rescueBagCapacity: number
  goldCost: number
  minLevel: number
}

export const RESCUE_BAG_UPGRADE_ROWS: RescueBagUpgradeRow[] = [
  { id: 'rb_5', rescueBagCapacity: 5, goldCost: 350, minLevel: 4 },
  { id: 'rb_7', rescueBagCapacity: 7, goldCost: 900, minLevel: 10 },
  { id: 'rb_10', rescueBagCapacity: 10, goldCost: 2400, minLevel: 16 },
]

export function getNextRescueBagUpgrade(currentCapacity: number): RescueBagUpgradeRow | null {
  const sorted = [...RESCUE_BAG_UPGRADE_ROWS].sort((a, b) => a.rescueBagCapacity - b.rescueBagCapacity)
  return sorted.find((r) => r.rescueBagCapacity > currentCapacity) ?? null
}
