import type { ColorMap, MetalName, Palette, PixelItem, RoughStone } from '../types'
import { METALS } from './metals'

function parseHex(hex: string) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => v.toString(16).padStart(2, '0')).join('')
}

export function lightenColor(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex)
  return rgbToHex(
    Math.min(255, Math.round(r + (255 - r) * amount)),
    Math.min(255, Math.round(g + (255 - g) * amount)),
    Math.min(255, Math.round(b + (255 - b) * amount)),
  )
}

export function darkenColor(hex: string, amount: number): string {
  const { r, g, b } = parseHex(hex)
  return rgbToHex(
    Math.max(0, Math.round(r * (1 - amount))),
    Math.max(0, Math.round(g * (1 - amount))),
    Math.max(0, Math.round(b * (1 - amount))),
  )
}

export const ROUGH_STONE_TEMPLATE: string[] = [
  '................',
  '......OOOO......',
  '....OODDDDOO....',
  '...ODDGGGGDDO...',
  '..ODGGGGGGDDO...',
  '..ODGGLLGGGDO...',
  '.ODGLLLLLGGGDO..',
  '.ODGLLLLLGGGDO..',
  '.ODGLLLLLGGDDO..',
  '..ODGLLGGGDDO...',
  '..ODGGGGGGDO....',
  '...ODDGGGDDO....',
  '....OODDDOO.....',
  '......OOOO......',
  '................',
  '................',
]

export function makeRoughStonePixelItem(palette: Palette, quality: RoughStone['quality']): PixelItem {
  const tint = quality === 'pristine' ? 0.2 : quality === 'crude' ? -0.15 : 0
  const map: ColorMap = { ...palette.colorMap }
  if (tint > 0) {
    for (const k of Object.keys(map)) {
      map[k] = lightenColor(map[k], tint)
    }
  }
  if (tint < 0) {
    for (const k of Object.keys(map)) {
      map[k] = darkenColor(map[k], -tint)
    }
  }
  return { data: ROUGH_STONE_TEMPLATE, colorMap: map }
}

export const RAW_ORE_TEMPLATE: string[] = [
  '................',
  '......BBBB......',
  '....BBMMMMBB....',
  '...BMMOOOMMOB...',
  '..BMOOOOOMMOOB..',
  '..BMOMMMOOMOOB..',
  '.BMOMMMMMOMMOOB.',
  '.BMOMMMMMOMMOOB.',
  '.BMOMMMMMOMMOOB.',
  '..BMOMOOOMMOOB..',
  '..BMOOOOOMMOB...',
  '...BMMOOOMMB....',
  '....BBMMMMBB....',
  '......BBBB......',
  '................',
  '................',
]

export const NUGGET_TEMPLATE: string[] = [
  '................',
  '......KKKK......',
  '.....KMMMMK.....',
  '....KMMFMMSK....',
  '...KMMMMMMMSK...',
  '..KMMFMMMMMMSK..',
  '..KMMMMMMMMMSK..',
  '..KMMMMMFMMMSK..',
  '..KMMMMMMMMSSK..',
  '..KMMMMMMMSSSK..',
  '...KMMMMMSSSK...',
  '....KMMSSSSK....',
  '.....KSSSSK.....',
  '......KKKK......',
  '................',
  '................',
]

export function makeOrePixelItem(metalName: MetalName): PixelItem {
  const metal = METALS[metalName]
  return {
    data: RAW_ORE_TEMPLATE,
    colorMap: { B: '#57534e', O: '#44403c', M: metal.pixelColor },
  }
}

export function makeNuggetPixelItem(metalName: MetalName): PixelItem {
  const metal = METALS[metalName]
  return {
    data: NUGGET_TEMPLATE,
    colorMap: {
      K: lightenColor(metal.pixelColor, 0.35),
      M: metal.pixelColor,
      S: darkenColor(metal.pixelColor, 0.35),
      F: '#ffffff',
    },
  }
}
