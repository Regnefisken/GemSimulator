import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { defaultGameState } from './gameState'
import { CURRENT_STATE_VERSION, migrateGameState } from './migrations'

const FIXTURE_DIR = join(process.cwd(), '__fixtures__/saves')
const FIXTURE_NAMES = ['early-game.json', 'mid-game.json', 'late-game.json'] as const

describe('migrateGameState fixtures (Fase 0 / implementation-guide §0.2)', () => {
  for (const fileName of FIXTURE_NAMES) {
    it(`${fileName}: version ${CURRENT_STATE_VERSION}, idempotent migration, samme nøgle-mængde som defaultGameState()`, () => {
      const raw = JSON.parse(readFileSync(join(FIXTURE_DIR, fileName), 'utf8')) as unknown
      expect(raw).toMatchObject({ version: CURRENT_STATE_VERSION })

      const fresh = defaultGameState()
      const once = migrateGameState(raw, fresh)
      expect(once.version).toBe(CURRENT_STATE_VERSION)

      const twice = migrateGameState(JSON.parse(JSON.stringify(once)) as unknown, defaultGameState())
      expect(twice).toEqual(once)

      expect(Object.keys(once).sort()).toEqual(Object.keys(fresh).sort())
    })
  }
})
