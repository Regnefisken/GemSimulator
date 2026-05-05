import type { ColorMap } from '../types'

/** Fallback for grid-chars not present on older palettes (P→G, V→L, S→W, C→O). */
export const CHAR_FALLBACKS: Record<string, string> = { P: 'G', V: 'L', S: 'W', C: 'O' }

export function resolveColor(char: string, colorMap: ColorMap): string | null {
  if (char === '.') return null
  let c = char
  const seen = new Set<string>()
  for (let guard = 0; guard < 8; guard++) {
    const col = colorMap[c]
    if (col) return col
    if (seen.has(c)) return null
    seen.add(c)
    const next = CHAR_FALLBACKS[c]
    if (!next) return null
    c = next
  }
  return null
}
