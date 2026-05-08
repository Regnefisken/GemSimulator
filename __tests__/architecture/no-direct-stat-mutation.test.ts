/**
 * Fase 0.3 / Fase 1.1 (implementation-guide): audit for direkte skrivninger til playerHpMax / playerManaMax
 * uden for clampPlayerSurvival, defaultGameState/initialState og migration.
 * Forventet grøn efter Fase 1.1 A3-oprydning.
 */
import { readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { describe, expect, it } from 'vitest'

type Violation = { file: string; line: number; text: string }

const RE_PROP = /\b(playerHpMax|playerManaMax)\s*:/

function findBlockEnd(lines: string[], startIdx: number): number {
  let depth = 0
  let started = false
  for (let i = startIdx; i < lines.length; i++) {
    const line = lines[i]!
    for (const ch of line) {
      if (ch === '{') {
        depth++
        started = true
      } else if (ch === '}') {
        depth--
        if (started && depth === 0) return i
      }
    }
  }
  return lines.length - 1
}

function lineRangeForExportConst(lines: string[], name: string): [number, number] | null {
  const re = new RegExp(`^export const ${name}(?:\\s*:\\s*\\w+)?\\s*=\\s*\\{`)
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i]!.trimStart())) {
      return [i, findBlockEnd(lines, i)]
    }
  }
  return null
}

function lineRangeForExportFunction(lines: string[], fnName: string): [number, number] | null {
  const re = new RegExp(`^export function ${fnName}\\s*\\(`)
  for (let i = 0; i < lines.length; i++) {
    if (re.test(lines[i]!.trimStart())) {
      const open = lines[i]!.indexOf('{')
      if (open === -1) continue
      let depth = 0
      for (let j = i; j < lines.length; j++) {
        const L = lines[j]!
        const from = j === i ? open : 0
        for (let k = from; k < L.length; k++) {
          const ch = L[k]!
          if (ch === '{') depth++
          else if (ch === '}') {
            depth--
            if (depth === 0) return [i, j]
          }
        }
      }
    }
  }
  return null
}

function scanFile(absPath: string, relPath: string): Violation[] {
  const text = readFileSync(absPath, 'utf8')
  const lines = text.split(/\n/)
  const violations: Violation[] = []

  const initial = relPath.endsWith('gameState.ts') ? lineRangeForExportConst(lines, 'initialState') : null
  const clamp = relPath.endsWith('survival.ts') ? lineRangeForExportFunction(lines, 'clampPlayerSurvival') : null

  lines.forEach((line, idx) => {
    const lineNo = idx + 1
    if (!RE_PROP.test(line)) return
    if (initial && lineNo >= initial[0] && lineNo <= initial[1]) return
    if (clamp && lineNo >= clamp[0] && lineNo <= clamp[1]) return
    violations.push({ file: relPath, line: lineNo, text: line.trim() })
  })

  return violations
}

function collectViolations(): Violation[] {
  const root = join(process.cwd(), 'src', 'lib')
  const targets = ['gameState.ts', 'survival.ts']
  const out: Violation[] = []
  for (const f of targets) {
    out.push(...scanFile(join(root, f), posix.join('src', 'lib', f)))
  }
  return out
}

describe('no-direct-stat-mutation (A3 audit)', () => {
  it('ingen direkte playerHpMax/playerManaMax-skrivninger uden for clamp/initialState/migration', () => {
    const found = collectViolations()
    if (found.length > 0) {
      console.info(
        '[no-direct-stat-mutation] violations:\n',
        found.map((v) => `${v.file}:${v.line} ${v.text}`).join('\n'),
      )
    }
    expect(found).toEqual([])
  })
})
