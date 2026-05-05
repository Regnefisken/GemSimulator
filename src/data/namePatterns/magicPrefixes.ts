/** Kort præfiks pr. magitype (bindestreg i `deriveGemName`). */
export const MAGIC_PREFIXES: Record<string, string> = {
  Ild: 'Flamme-',
  Frost: 'Frost-',
  Lyn: 'Lyn-',
  Natur: 'Naturens ',
  Giftig: 'Gift-',
  Helbredende: 'Liv-',
  Sjælebindende: 'Sjæle-',
  Tidskontrollerende: 'Tids-',
  Radioaktiv: 'Aske-',
}

/** Suffiks når flere magier skal nævnes eksplicit (sjældent brugt alene). */
export const MAGIC_SUFFIXES: Record<string, string> = {
  Ild: 'Ild',
  Frost: 'Frost',
  Lyn: 'Lyn',
  Natur: 'Natur',
  Giftig: 'Gift',
  Helbredende: 'Helbredelse',
  Sjælebindende: 'Sjæle',
  Tidskontrollerende: 'Tid',
  Radioaktiv: 'Radioaktivitet',
}
