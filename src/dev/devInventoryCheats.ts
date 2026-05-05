import type { Dispatch } from 'react'
import type { Action } from '../lib/gameState'
import type { GameState, MetalName, RoughStone } from '../types'
import { ALLOY_ONLY_METALS, MINEABLE_METALS } from '../types'
import { METALS } from '../data/metals'
import { PALETTES } from '../data/palettes'
import {
  makeIngotPixelItem,
  makeNuggetPixelItem,
  makeOrePixelItem,
  makeRoughStonePixelItem,
} from '../data/oreTemplates'

function roughStoneId(i: number): string {
  return `dev-rough-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`
}

/** Rå klipper med samme fordeling som mining (palette tilfældig, kvalitet efter `quality`). */
export function devSpawnRoughStones(
  dispatch: Dispatch<Action>,
  count: number,
  quality: RoughStone['quality'] | 'mixed',
): void {
  const n = Math.min(Math.max(0, count), 80)
  for (let i = 0; i < n; i++) {
    const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)]!
    const q: RoughStone['quality'] =
      quality === 'mixed'
        ? Math.random() < 0.6
          ? 'crude'
          : Math.random() < 0.92
            ? 'fine'
            : 'pristine'
        : quality
    const stone: RoughStone = {
      id: roughStoneId(i),
      paletteName: palette.name,
      quality: q,
      pixelItem: makeRoughStonePixelItem(palette, q),
    }
    dispatch({ type: 'ADD_ROUGH_STONE', stone })
  }
}

/** Én metalbar pr. metaltype (minebare + legeringer). */
export function devSpawnIngotsEveryMetal(dispatch: Dispatch<Action>, qtyEach: number): void {
  const q = Math.min(Math.max(1, qtyEach), 99)
  const names = [...MINEABLE_METALS, ...ALLOY_ONLY_METALS]
  for (const metalName of names) {
    if (!METALS[metalName]) continue
    dispatch({
      type: 'ADD_INGOT',
      ingot: { metalName, quantity: q, pixelItem: makeIngotPixelItem(metalName) },
    })
  }
}

/** Lidt malm + klump for hvert minebare metal (smedje-test). */
export function devSpawnOreAndNuggetKit(dispatch: Dispatch<Action>): void {
  for (const metalName of MINEABLE_METALS) {
    dispatch({
      type: 'ADD_ORE',
      ore: { metalName, quantity: 4, pixelItem: makeOrePixelItem(metalName) },
    })
    dispatch({
      type: 'ADD_NUGGET',
      nugget: { metalName, quantity: 2, pixelItem: makeNuggetPixelItem(metalName) },
    })
  }
}

/** Titanium, platin + legeringsbarer (som tidligere enkelt-knap). */
export function devSpawnExoticMetalPack(dispatch: Dispatch<Action>): void {
  const mineable: MetalName[] = ['Titanium', 'Platin']
  for (const m of mineable) {
    dispatch({ type: 'ADD_ORE', ore: { metalName: m, quantity: 4, pixelItem: makeOrePixelItem(m) } })
    dispatch({ type: 'ADD_NUGGET', nugget: { metalName: m, quantity: 2, pixelItem: makeNuggetPixelItem(m) } })
    dispatch({ type: 'ADD_INGOT', ingot: { metalName: m, quantity: 1, pixelItem: makeIngotPixelItem(m) } })
  }
  for (const m of ['Orichalcum', 'Elektrum'] as const) {
    dispatch({ type: 'ADD_INGOT', ingot: { metalName: m, quantity: 1, pixelItem: makeIngotPixelItem(m) } })
  }
}

/** Tilfældige gems uden XP (kun når `DEV_BULK_RANDOM_GEMS` er aktiv i build). */
export function devSpawnRandomGems(dispatch: Dispatch<Action>, count: number): void {
  dispatch({ type: 'DEV_BULK_RANDOM_GEMS', count: Math.min(Math.max(0, count), 300) })
}

export function devFillGemsToCapacity(dispatch: Dispatch<Action>, state: GameState): void {
  const need = state.inventoryCapacity.gems - state.gems.length
  if (need > 0) devSpawnRandomGems(dispatch, need)
}
