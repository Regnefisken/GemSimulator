import { describe, expect, it } from 'vitest'
import { mergeFoundLootEntryIntoList, normalizeStackableFoundLoot, tryMergeFoundLootEntries } from './foundLootStack'
import type { OreFoundLootEntry } from '../types'

const dummyOre = (metal: 'Tin' | 'Kobber', q: number): OreFoundLootEntry => ({
  kind: 'ore',
  origin: 'mine',
  ore: {
    metalName: metal,
    quantity: q,
    pixelItem: { data: [], colorMap: {} },
  },
})

describe('foundLootStack', () => {
  it('merger malm med samme metal', () => {
    const a = dummyOre('Tin', 1)
    const b = dummyOre('Tin', 1)
    expect(tryMergeFoundLootEntries(a, b)?.ore.quantity).toBe(2)
    expect(tryMergeFoundLootEntries(a, dummyOre('Kobber', 1))).toBeNull()
  })

  it('mergeFoundLootEntryIntoList tilføjer ny række når ingen match', () => {
    const list = mergeFoundLootEntryIntoList([], dummyOre('Tin', 1))
    expect(list).toHaveLength(1)
    const list2 = mergeFoundLootEntryIntoList(list, dummyOre('Kobber', 3))
    expect(list2).toHaveLength(2)
  })

  it('fold gamle dubletter til én post', () => {
    const merged = normalizeStackableFoundLoot([
      dummyOre('Tin', 1),
      dummyOre('Tin', 1),
      { kind: 'coal', quantity: 2, origin: 'mine' },
      { kind: 'coal', quantity: 3, origin: 'mine' },
    ])
    expect(merged).toHaveLength(2)
    expect(merged.find((e) => e.kind === 'ore')).toMatchObject({ kind: 'ore', ore: { quantity: 2 } })
    expect(merged.find((e) => e.kind === 'coal')).toMatchObject({ kind: 'coal', quantity: 5 })
  })
})
