import { describe, expect, it, vi } from 'vitest'
import { migrateGameState, CURRENT_STATE_VERSION } from '../lib/migrations'
import { initialState } from '../lib/gameState'
import { STARTER_BLUEPRINT_IDS } from '../data/blueprints'

describe('migrateGameState v9', () => {
  it('nulstiller gems ved version < 9', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const raw = {
      ...initialState,
      version: 8,
      totalGemsFound: 99,
      gems: [
        {
          id: 'x',
          name: 'Brilliant Rubin',
          purity: 2,
          karat: null,
          data: [],
          colorMap: {},
          timestamp: '',
          isGodTier: false,
          metalInclusions: [],
          magicProperties: [],
          goldValue: 10,
        },
      ],
      roughStones: [{ id: 'r', paletteName: 'Rubin', quality: 'fine' as const, pixelItem: { data: [], colorMap: {} } }],
    }
    const next = migrateGameState(raw, initialState)
    expect(next.gems).toEqual([])
    expect(next.roughStones).toEqual([])
    expect(next.totalGemsFound).toBe(0)
    expect(warn).toHaveBeenCalled()
    warn.mockRestore()
  })
})

describe('migrateGameState v10', () => {
  it('tilføjer unlockedBlueprints med starter-IDs hvis ikke til stede', () => {
    const raw = { ...initialState, version: 9, jewelry: [] }
    delete (raw as { unlockedBlueprints?: string[] }).unlockedBlueprints
    const next = migrateGameState(raw, initialState)
    expect(next.unlockedBlueprints).toEqual(STARTER_BLUEPRINT_IDS)
  })

  it('migrerer legacy jewelry.recipeId → blueprintId', () => {
    const raw = {
      ...initialState,
      version: 9,
      jewelry: [
        {
          id: 'j1',
          recipeId: 'simple-ring',
          name: 'Simpel Ring',
          gemUsed: { id: 'g1', name: 'Rubin' },
          ingotsUsed: [{ metalName: 'Kobber', quantity: 1 }],
          goldValue: 50,
          reputationValue: 1,
          pixelItem: { data: [], colorMap: {} },
          timestamp: '12:00',
        },
      ],
    }
    const next = migrateGameState(raw, initialState)
    expect(next.jewelry[0]!.blueprintId).toBe('simple_band')
    expect(next.jewelry[0]!.gemsUsed).toEqual([{ id: 'g1', name: 'Rubin' }])
  })
})

describe('migrateGameState v11', () => {
  it('sætter totalJewelryCrafted ud fra smykke-liste når gammel save (v10) havde 0', () => {
    const raw = {
      ...initialState,
      version: 10,
      totalJewelryCrafted: 0,
      gems: [],
      jewelry: [
        {
          id: 'j1',
          recipeId: 'simple-ring',
          blueprintId: 'simple_band',
          name: 'Simpel Ring',
          gemUsed: { id: 'g1', name: 'Rubin' },
          gemsUsed: [{ id: 'g1', name: 'Rubin' }],
          ingotsUsed: [{ metalName: 'Kobber' as const, quantity: 1 }],
          goldValue: 50,
          reputationValue: 1,
          pixelItem: { data: [], colorMap: {} },
          timestamp: '12:00',
        },
      ],
    }
    const next = migrateGameState(raw, initialState)
    expect(next.totalJewelryCrafted).toBe(1)
  })
})

describe('migrateGameState v12', () => {
  it('kopierer legacy depth til unlockedDepths for alle miner og nulstiller mineRun', () => {
    const raw = {
      ...initialState,
      version: 11,
      depth: 42,
      mineRun: { runId: 'x', mineId: 'kobbermine', currentDepth: 1, rockSlotsClearedThisRun: 0, targetSlotIndex: 0, slots: [] },
    }
    const next = migrateGameState(raw, initialState)
    expect(next.version).toBe(CURRENT_STATE_VERSION)
    expect(next.mineRun).toBeNull()
    expect(next.unlockedDepths['kobbermine']).toBe(42)
    expect(next.unlockedDepths['mithrilbjerget']).toBe(42)
    expect(next.totalRockSlotsCleared).toBe(42)
    expect(next.depth).toBeGreaterThanOrEqual(42)
  })
})

describe('migrateGameState v13 survival', () => {
  it('tilføjer HP/mana fra base når felter mangler på gammel save', () => {
    const raw = { ...initialState, version: 12 } as Record<string, unknown>
    delete raw.playerHp
    delete raw.playerHpMax
    delete raw.playerMana
    delete raw.playerManaMax
    const next = migrateGameState(raw, initialState)
    expect(next.playerHp).toBe(initialState.playerHpMax)
    expect(next.playerMana).toBe(initialState.playerManaMax)
  })

  it('klamper HP/mana over max efter load', () => {
    const raw = {
      ...initialState,
      version: 12,
      playerHp: 999,
      playerHpMax: 100,
      playerMana: 200,
      playerManaMax: 50,
    }
    const next = migrateGameState(raw, initialState)
    expect(next.playerHp).toBe(100)
    expect(next.playerMana).toBe(50)
  })
})

describe('migrateGameState v15 consumables & alkymi', () => {
  it('tilføjer consumables, hylder, quick-slots og alkymi-lokation på gammel save', () => {
    const raw = {
      ...initialState,
      version: 14,
    } as Record<string, unknown>
    delete raw.consumables
    delete raw.workshopStock
    delete raw.consumableQuickSlots
    raw.unlockedLocations = ['kobbermine', 'smedjen', 'butikken']
    const next = migrateGameState(raw, initialState)
    expect(next.hubInventory.consumables).toEqual([])
    expect(next.consumableQuickSlots).toEqual([null, null, null])
    expect(next.workshopStock).toEqual(expect.objectContaining({ cons_bread_minor: 12 }))
    expect(next.unlockedLocations).toContain('alkymistvaerkstedet')
  })
})

describe('migrateGameState v16 brew / alkymi-opskrifter', () => {
  it('tilføjer unlockedAlchemyRecipes på v15-save', () => {
    const raw = {
      ...initialState,
      version: 15,
    } as Record<string, unknown>
    delete raw.unlockedAlchemyRecipes
    delete raw.activeBrewId
    const next = migrateGameState(raw, initialState)
    expect(next.version).toBe(CURRENT_STATE_VERSION)
    expect(next.unlockedAlchemyRecipes).toContain('recipe_solar_elixir')
    expect(next.activeBrewId).toBeNull()
  })
})

describe('migrateGameState v18 hub/run inventar', () => {
  it('flytter top-level guld og consumables til hubInventory og nulstiller aktiv mine-run', () => {
    const raw = {
      ...initialState,
      version: 17,
      gold: 333,
      consumables: [{ consumableId: 'cons_bread_minor', quantity: 3 }],
      mineRun: { stub: true },
    } as Record<string, unknown>
    const next = migrateGameState(raw, initialState)
    expect(next.version).toBe(CURRENT_STATE_VERSION)
    expect(next.hubInventory.gold).toBe(333)
    expect(next.hubInventory.consumables).toEqual([{ consumableId: 'cons_bread_minor', quantity: 3 }])
    expect(next.mineRun).toBeNull()
    expect(next.runInventory).toBeNull()
    expect(next.gameNotice).toMatch(/v18/)
  })
})

describe('migrateGameState v19 D47 origin', () => {
  it('sætter origin hub på værktøj der manglede felt', () => {
    const raw = {
      ...initialState,
      version: 18,
      pickaxes: initialState.pickaxes.map(({ origin: _o, ...rest }) => ({ ...rest })),
    } as Record<string, unknown>
    const next = migrateGameState(raw, initialState)
    expect(next.version).toBe(CURRENT_STATE_VERSION)
    expect(next.pickaxes.every((p) => p.origin === 'hub')).toBe(true)
  })
})

describe('migrateGameState v20 dag + redningspose-meta', () => {
  it('udleder rescueBagCapacity fra aktiv runInventory når felt mangler på top-level', () => {
    const raw = {
      ...initialState,
      version: 19,
      runInventory: {
        foundLoot: [],
        rescueBag: [],
        rescueBagCapacity: 5,
        questItems: [],
        stowedHubGear: [],
      },
    } as Record<string, unknown>
    delete raw.day
    delete raw.lastRestockDay
    delete raw.rescueBagCapacity
    const next = migrateGameState(raw, initialState)
    expect(next.rescueBagCapacity).toBe(5)
    expect(next.day).toBe(1)
    expect(next.lastRestockDay).toBeGreaterThanOrEqual(1)
  })
})

describe('migrateGameState v21 måne-opskrift', () => {
  it('tilføjer recipe_lunar_draught til eksisterende alkymi-unlocks', () => {
    const raw = {
      ...initialState,
      version: 20,
      unlockedAlchemyRecipes: ['recipe_solar_elixir'],
    } as Record<string, unknown>
    const next = migrateGameState(raw, initialState)
    expect(next.version).toBe(CURRENT_STATE_VERSION)
    expect(next.unlockedAlchemyRecipes).toContain('recipe_lunar_draught')
  })
})
