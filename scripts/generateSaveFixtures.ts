/**
 * Genererer seed-saves til __fixtures__/saves/ (implementation-guide §0.2).
 * Kør: npm run generate:fixtures
 */
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { makeArmour } from '../src/data/armour'
import { defaultGameState } from '../src/lib/gameState'
import { migrateGameState } from '../src/lib/migrations'
import type { GameState } from '../src/types'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = join(__dirname, '..')
const outDir = join(root, '__fixtures__/saves')

function writeFixture(name: string, patch: Partial<GameState>): void {
  const base = defaultGameState()
  const raw = { ...base, ...patch, version: base.version } as Record<string, unknown>
  const migrated = migrateGameState(raw, defaultGameState())
  writeFileSync(join(outDir, name), JSON.stringify(migrated, null, 2), 'utf8')
}

mkdirSync(outDir, { recursive: true })

writeFixture('early-game.json', {
  hubInventory: { ...defaultGameState().hubInventory, gold: 180 },
  depth: 1,
  unlockedDepths: { kobbermine: 2 },
  totalRockSlotsCleared: 8,
  coal: 5,
})

writeFixture('mid-game.json', {
  hubInventory: {
    ...defaultGameState().hubInventory,
    gold: 4200,
    consumables: [
      { consumableId: 'cons_bread_minor', quantity: 4 },
      { consumableId: 'cons_minor_heal_potion', quantity: 2 },
    ],
  },
  level: 9,
  xp: 120,
  depth: 4,
  unlockedDepths: {
    kobbermine: 6,
    jernkloeften: 4,
    soelvhulen: 2,
  },
  totalRockSlotsCleared: 120,
  coal: 45,
  achievementsUnlocked: ['first_gem', 'level_10'],
})

const lateArmourA = makeArmour(3, 'fixture-a')
const lateArmourB = makeArmour(4, 'fixture-b')

writeFixture('late-game.json', {
  hubInventory: {
    ...defaultGameState().hubInventory,
    gold: 88000,
    consumables: [
      { consumableId: 'cons_bread_minor', quantity: 12 },
      { consumableId: 'cons_minor_heal_potion', quantity: 8 },
      { consumableId: 'cons_brew_solar_vigor', quantity: 2 },
    ],
  },
  level: 28,
  xp: 4000,
  depth: 12,
  unlockedDepths: {
    kobbermine: 14,
    jernkloeften: 11,
    soelvhulen: 9,
    guldgrotten: 6,
    mithrilbjerget: 4,
    'rune-dybet': 2,
  },
  totalRockSlotsCleared: 2400,
  totalGemsFound: 42,
  coal: 200,
  smelterTier: 3,
  armours: [lateArmourA, lateArmourB],
  activeArmourId: lateArmourB.id,
  activeBrewId: 'brew_solar_vigor',
  achievementsUnlocked: ['first_gem', 'gems_25', 'gold_1000'],
})

console.log('Wrote early-game.json, mid-game.json, late-game.json →', outDir)
