import { describe, expect, it } from 'vitest'
import type { GameState } from '../types'
import { reducer, initialState } from './gameState'
import { createInitialMineRun } from '../gem/mineLayer'
import { AREAS } from '../data/areas'
import { WORKSHOP_DEFAULT_STOCK } from '../data/consumables'

const emptyRun = (): NonNullable<GameState['runInventory']> => ({
  foundLoot: [],
  rescueBag: [],
  rescueBagCapacity: 3,
  questItems: [],
  stowedHubGear: [],
})

describe('Fase 3 alkymi & forbrug', () => {
  it('BUY_WORKSHOP_CONSUMABLE trækker guld og hyldelager', () => {
    const base: GameState = {
      ...initialState,
      hubInventory: { ...initialState.hubInventory, gold: 1000 },
      workshopStock: { ...WORKSHOP_DEFAULT_STOCK },
    }
    const next = reducer(base, { type: 'BUY_WORKSHOP_CONSUMABLE', consumableId: 'cons_bread_minor' })
    expect(next.hubInventory.gold).toBe(1000 - 25)
    expect(next.workshopStock.cons_bread_minor).toBe((WORKSHOP_DEFAULT_STOCK.cons_bread_minor ?? 0) - 1)
    const row = next.hubInventory.consumables.find((c) => c.consumableId === 'cons_bread_minor')
    expect(row?.quantity).toBe(1)
  })

  it('MINE_RUN_EXIT med valid run (klippe ryddet) restocker og øger dag', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const rockIdx = run.slots.findIndex((s) => s.kind === 'rock' && !s.cleared)
    expect(rockIdx).toBeGreaterThanOrEqual(0)
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: { ...run, targetSlotIndex: rockIdx },
      runInventory: emptyRun(),
      workshopStock: { cons_bread_minor: 1 },
      day: 3,
      lastRestockDay: 3,
    }
    const cleared = reducer(base, { type: 'MINE_DEAL_DAMAGE', slotIndex: rockIdx, damage: 1_000_000 })
    const next = reducer(cleared, { type: 'MINE_RUN_EXIT' })
    expect(next.workshopStock).toEqual(WORKSHOP_DEFAULT_STOCK)
    expect(next.day).toBe(4)
    expect(next.lastRestockDay).toBe(4)
  })

  it('MINE_RUN_EXIT uden aktivitet (invalid run) restocker ikke og øger ikke dag', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: run,
      runInventory: emptyRun(),
      workshopStock: { cons_bread_minor: 1 },
      day: 5,
      lastRestockDay: 5,
    }
    const next = reducer(base, { type: 'MINE_RUN_EXIT' })
    expect(next.workshopStock.cons_bread_minor).toBe(1)
    expect(next.day).toBe(5)
  })

  it('MINE_RUN_EXIT uden aktiv mine-run ændrer ikke state', () => {
    const base: GameState = {
      ...initialState,
      workshopStock: { cons_bread_minor: 1 },
    }
    const next = reducer(base, { type: 'MINE_RUN_EXIT' })
    expect(next).toEqual(base)
  })

  it('USE_CONSUMABLE_QUICK_SLOT uden aktiv mine giver besked', () => {
    const base: GameState = {
      ...initialState,
      hubInventory: {
        ...initialState.hubInventory,
        consumables: [{ consumableId: 'cons_bread_minor', quantity: 1 }],
      },
      consumableQuickSlots: ['cons_bread_minor', null, null],
    }
    const next = reducer(base, { type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: 0 })
    expect(next.gameNotice).toMatch(/Kun i minen/)
    expect(next.hubInventory.consumables[0]?.quantity).toBe(1)
  })

  it('USE_CONSUMABLE_QUICK_SLOT i mine bruger genstand og helbreder', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: run,
      playerHp: 10,
      playerHpMax: 100,
      hubInventory: {
        ...initialState.hubInventory,
        consumables: [{ consumableId: 'cons_bread_minor', quantity: 2 }],
      },
      consumableQuickSlots: ['cons_bread_minor', null, null],
    }
    const next = reducer(base, { type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: 0 })
    expect(next.playerHp).toBeGreaterThan(10)
    const row = next.hubInventory.consumables.find((c) => c.consumableId === 'cons_bread_minor')
    expect(row?.quantity).toBe(1)
  })
})

describe('Fase 4 alkymi brew & blandning', () => {
  it('CRAFT_ALCHEMY_RECIPE forbruger ingredienser og giver sol-eliksir', () => {
    const base: GameState = {
      ...initialState,
      hubInventory: {
        ...initialState.hubInventory,
        consumables: [{ consumableId: 'ing_glow_moss', quantity: 5 }],
      },
    }
    const next = reducer(base, { type: 'CRAFT_ALCHEMY_RECIPE', recipeId: 'recipe_solar_elixir' })
    expect(next.hubInventory.consumables.find((c) => c.consumableId === 'ing_glow_moss')?.quantity).toBe(2)
    expect(next.hubInventory.consumables.find((c) => c.consumableId === 'cons_brew_solar_vigor')?.quantity).toBe(1)
  })

  it('USE_CONSUMABLE sol-eliksir sætter aktiv brew og manaMax', () => {
    const area = AREAS.find((a) => a.id === 'kobbermine')!
    const run = createInitialMineRun({ area, mineId: 'kobbermine', activeCharms: [] })
    const base: GameState = {
      ...initialState,
      viewMode: 'location',
      currentArea: 'kobbermine',
      mineRun: run,
      runInventory: {
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 3,
        questItems: [],
        stowedHubGear: [],
      },
      playerMana: 40,
      hubInventory: {
        ...initialState.hubInventory,
        consumables: [{ consumableId: 'cons_brew_solar_vigor', quantity: 1 }],
      },
      consumableQuickSlots: ['cons_brew_solar_vigor', null, null],
    }
    const next = reducer(base, { type: 'USE_CONSUMABLE_QUICK_SLOT', slotIndex: 0 })
    expect(next.activeBrewId).toBe('brew_solar_vigor')
    expect(next.playerManaMax).toBe(65)
    expect(next.playerMana).toBeLessThanOrEqual(65)
  })

  it('UNLOCK_ALCHEMY_RECIPE tilføjer id', () => {
    const base: GameState = {
      ...initialState,
      unlockedAlchemyRecipes: [],
    }
    const next = reducer(base, { type: 'UNLOCK_ALCHEMY_RECIPE', recipeId: 'recipe_solar_elixir' })
    expect(next.unlockedAlchemyRecipes).toContain('recipe_solar_elixir')
  })
})
