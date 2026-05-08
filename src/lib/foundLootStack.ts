import type {
  CoalFoundLootEntry,
  FoundLootEntry,
  NuggetFoundLootEntry,
  OreFoundLootEntry,
} from '../types'

/** Sammenlæg stable materialer (kul/malm/klump) med samme metal — ét UI-slot pr. type. */
export function tryMergeFoundLootEntries(a: CoalFoundLootEntry, b: CoalFoundLootEntry): CoalFoundLootEntry | null
export function tryMergeFoundLootEntries(a: OreFoundLootEntry, b: OreFoundLootEntry): OreFoundLootEntry | null
export function tryMergeFoundLootEntries(
  a: NuggetFoundLootEntry,
  b: NuggetFoundLootEntry,
): NuggetFoundLootEntry | null
export function tryMergeFoundLootEntries(a: FoundLootEntry, b: FoundLootEntry): FoundLootEntry | null
export function tryMergeFoundLootEntries(a: FoundLootEntry, b: FoundLootEntry): FoundLootEntry | null {
  if (a.kind !== b.kind) return null
  switch (a.kind) {
    case 'coal':
      if (b.kind !== 'coal') return null
      return { ...a, quantity: a.quantity + b.quantity }
    case 'ore':
      if (b.kind !== 'ore') return null
      if (a.ore.metalName !== b.ore.metalName) return null
      return {
        ...a,
        ore: {
          ...a.ore,
          quantity: a.ore.quantity + b.ore.quantity,
        },
      }
    case 'nugget':
      if (b.kind !== 'nugget') return null
      if (a.nugget.metalName !== b.nugget.metalName) return null
      return {
        ...a,
        nugget: {
          ...a.nugget,
          quantity: a.nugget.quantity + b.nugget.quantity,
        },
      }
    default:
      return null
  }
}

export function mergeFoundLootEntryIntoList(list: FoundLootEntry[], entry: FoundLootEntry): FoundLootEntry[] {
  for (let i = 0; i < list.length; i++) {
    const merged = tryMergeFoundLootEntries(list[i]!, entry)
    if (merged) {
      return list.map((x, j) => (j === i ? merged : x))
    }
  }
  return [...list, entry]
}

/** Fold hele listen (fx efter load), så gamle saves uden stack også komprimeres. */
export function normalizeStackableFoundLoot(entries: FoundLootEntry[]): FoundLootEntry[] {
  let out: FoundLootEntry[] = []
  for (const e of entries) {
    out = mergeFoundLootEntryIntoList(out, e)
  }
  return out
}
