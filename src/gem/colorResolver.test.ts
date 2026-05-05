import { describe, expect, it } from 'vitest'
import { resolveColor, CHAR_FALLBACKS } from './colorResolver'

describe('resolveColor', () => {
  it('resolves P via G fallback', () => {
    const map = { O: '#111', D: '#222', G: '#333', L: '#444', W: '#555' }
    expect(resolveColor('P', map)).toBe('#333')
  })

  it('returns null for unknown char with no chain', () => {
    expect(resolveColor('Z', { G: '#1' })).toBeNull()
  })

  it('documents CHAR_FALLBACKS keys', () => {
    expect(CHAR_FALLBACKS.P).toBe('G')
  })
})
