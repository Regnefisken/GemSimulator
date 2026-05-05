import type { Gem } from '../types'
import { MAGIC_PREFIXES, MAGIC_SUFFIXES } from '../data/namePatterns/magicPrefixes'
import { MAGIC_SYNONYM_PALETTES } from '../data/namePatterns/magicSynonyms'
import { GOD_TIER_PREFIX, KARAT_TEMPLATE, PURITY_PREFIXES } from '../data/namePatterns/qualityPhrases'
import { buildMetalPhrase } from '../data/namePatterns/metalPhrases'

export type GemNameLayers = Pick<
  Gem,
  'shapeName' | 'paletteName' | 'metalInclusions' | 'magicProperties' | 'purity' | 'isGodTier' | 'karat'
>

function paletteImpliesMagic(paletteName: string, magicName: string): boolean {
  const pals = MAGIC_SYNONYM_PALETTES[magicName]
  return pals ? pals.some((p) => paletteName === p || paletteName.includes(p)) : false
}

function magicSuffixLabel(name: string): string {
  return MAGIC_SUFFIXES[name] ?? name
}

function buildMagicSuffix(magicProperties: GemNameLayers['magicProperties']): string {
  if (magicProperties.length < 2) return ''
  const labels = magicProperties.slice(1).map((m) => magicSuffixLabel(m.name))
  if (labels.length === 1) return ` af ${labels[0]}`
  if (labels.length === 2) return ` af ${labels[0]} og ${labels[1]}`
  return ` af ${labels.slice(0, -1).join(', ')} og ${labels[labels.length - 1]}`
}

function assemble(opts: {
  god: string
  pur: string
  karat: string
  magPref: string
  core: string
  metal: string
  magSuf: string
}): string {
  const { god, pur, karat, magPref, core, metal, magSuf } = opts
  let s = `${god}${pur}${karat}${magPref}${core}`
  if (metal) s += ` ${metal}`
  if (magSuf) s += magSuf
  return s.replace(/\s+/g, ' ').trim()
}

export function deriveGemName(g: GemNameLayers): string {
  const first = g.magicProperties[0]
  const synonymSkip = first != null && paletteImpliesMagic(g.paletteName, first.name)
  const magPref = first && !synonymSkip ? (MAGIC_PREFIXES[first.name] ?? '') : ''

  let god = g.isGodTier ? GOD_TIER_PREFIX : ''
  const pur = PURITY_PREFIXES[g.purity] ?? ''
  const karat = g.karat != null ? KARAT_TEMPLATE(g.karat) : ''
  const core = `${g.shapeName} ${g.paletteName}`.trim()
  let metal = buildMetalPhrase(g.metalInclusions)
  let magSuf = buildMagicSuffix(g.magicProperties)

  let magPrefStr = magPref
  let s = assemble({ god, pur, karat, magPref: magPrefStr, core, metal, magSuf })

  while (s.length > 60) {
    if (magSuf) {
      magSuf = ''
    } else if (metal && metal !== 'med spor') {
      metal = buildMetalPhrase(g.metalInclusions, true)
    } else if (magPrefStr) {
      magPrefStr = ''
    } else if (god) {
      god = ''
    } else {
      break
    }
    s = assemble({ god, pur, karat, magPref: magPrefStr, core, metal, magSuf })
  }

  return s
}
