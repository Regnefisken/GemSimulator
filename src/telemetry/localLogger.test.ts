import { describe, expect, it, beforeEach } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { __resetTelemetryForTests, getRecentTelemetry, logTelemetry } from './localLogger'

const loggerPath = join(fileURLToPath(new URL('.', import.meta.url)), 'localLogger.ts')

describe('localLogger (D45)', () => {
  beforeEach(() => {
    __resetTelemetryForTests()
  })

  it('holder ring-buffer-cap (max 200 events)', () => {
    for (let i = 0; i < 250; i++) {
      logTelemetry('test_tick', { i })
    }
    expect(getRecentTelemetry(500).length).toBe(200)
    expect(getRecentTelemetry(500)[0]?.payload.i).toBe(50)
  })

  it('JSON-shape: event, timestamp, payload', () => {
    logTelemetry('mine_run_start', { mineId: 'kobbermine' })
    const e = getRecentTelemetry(1)[0]!
    expect(typeof e.event).toBe('string')
    expect(typeof e.timestamp).toBe('number')
    expect(e.payload).toEqual({ mineId: 'kobbermine' })
  })

  it('kildekode: ingen fetch/XMLHttpRequest i telemetri-modulet', () => {
    const src = readFileSync(loggerPath, 'utf8')
    expect(src).not.toMatch(/\bfetch\b/)
    expect(src).not.toMatch(/XMLHttpRequest/)
  })
})
