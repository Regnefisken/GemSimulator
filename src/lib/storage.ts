import type { Gem } from '../types'

const KEY = 'gem-collection'

export function loadCollection(): Gem[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Gem[]) : []
  } catch {
    return []
  }
}

export function saveCollection(gems: Gem[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(gems))
  } catch {
    // localStorage utilgængelig eller fuld
  }
}
