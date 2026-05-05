import type { MetalInclusion } from '../../types'

const SINGLE: Record<string, string> = {
  Guld: 'med Guldåre',
  Sølv: 'med Sølvspor',
  Kobber: 'med Kobberveining',
  Jern: 'med Jern-fnug',
  Tin: 'med Tinprikker',
  Bronze: 'med Bronze-spor',
  Mithril: 'med Mithril-glød',
  Runestål: 'med Rune-årer',
  Platin: 'med Platin-glans',
  Titanium: 'med Titanium-streger',
  Orichalcum: 'med Orichalcum-flammer',
  Elektrum: 'med Elektrum-skær',
}

/** Fuld metal-led til navnet (tom streng hvis ingen inklusioner). */
export function buildMetalPhrase(inclusions: MetalInclusion[], short = false): string {
  if (inclusions.length === 0) return ''
  if (short) return 'med spor'
  const names = inclusions.map((i) => i.name)
  if (names.length === 1) return SINGLE[names[0]!] ?? `med ${names[0]}`
  if (names.length === 2) return `med ${names[0]}- og ${names[1]}-spor`
  return `med ${names[0]}-, ${names[1]}- og ${names[2]}-spor`
}
