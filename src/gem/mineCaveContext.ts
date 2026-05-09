import type { Area, CaveConfig, RoomSize, RoomTemplate } from '../types'
import { getCaveConfig } from '../types'

/** Antal interaktive felter pr. lag (kerne-lag, uafhængigt af grafik-preset). */
export const MIN_INTERACTIVE_SLOTS = 5
export const MAX_INTERACTIVE_SLOTS = 10

const TEMPLATE_WEIGHTS: Record<RoomTemplate, number> = {
  classic: 48,
  corridor: 20,
  island: 18,
  dogleg: 14,
}

const SIZE_WEIGHTS: Record<RoomSize, number> = {
  compact: 24,
  normal: 52,
  expansive: 24,
}

const ROOM_SIZE_WORLD_MUL: Record<RoomSize, number> = {
  compact: 0.9,
  normal: 1,
  expansive: 1.14,
}

/** Ekstra halvakse-margin omkring malm-pivot (skaleret mesh rager ud over pivot). */
const INTERACTIVE_ORE_MESH_PAD = 0.9

const PHI = 0.6180339887498949

/** Deterministisk [-1, 1]-lignende offset (ingen ekstra RNG — samme mønster som lag-kerne). */
function oreSlotLayoutUnit(k: number, salt: number): number {
  const t = Math.sin((k + 1) * 2.618 + salt * 1.713) * Math.cos((k + 1) * 1.337 + salt * 2.091)
  return Math.max(-1, Math.min(1, t))
}

/** Deler hash/RNG med `mineLayer` — skal være identisk for reproducerbare lag. */
export function hashStringToSeed(s: string): number {
  let h = 1779033703
  for (let i = 0; i < s.length; i++) {
    h = Math.imul(h ^ s.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  return h >>> 0
}

/** Samme som `MiningCave3D` proceduralSeed — bruges til gulv/malm‑lodret justering. */
export function getProceduralMineCaveSeed(mineRunId: string, runDepth: number): number {
  return hashStringToSeed(`${mineRunId}|${runDepth}|proceduralCave`)
}

export function mulberry32(seed: number): () => number {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function mineLayerSeedKey(runId: string, mineId: string, depth: number): string {
  return `${runId}|${mineId}|${depth}`
}

/** Første `rng()`-træk i lag-generering — skal matche `resolveEffectiveCaveConfig`. */
export function drawInteractiveSlotCount(rng: () => number): number {
  return (
    MIN_INTERACTIVE_SLOTS +
    Math.floor(rng() * (MAX_INTERACTIVE_SLOTS - MIN_INTERACTIVE_SLOTS + 1))
  )
}

const TEMPLATE_ORDER: RoomTemplate[] = ['classic', 'corridor', 'island', 'dogleg']

/** Andet træk efter slot-antal — skal kaldes i samme rækkefølge i `generateLayerState`. */
export function drawRoomTemplate(rng: () => number): RoomTemplate {
  const total = TEMPLATE_ORDER.reduce((s, k) => s + TEMPLATE_WEIGHTS[k], 0)
  let r = rng() * total
  for (const k of TEMPLATE_ORDER) {
    const w = TEMPLATE_WEIGHTS[k]
    if (r < w) return k
    r -= w
  }
  return 'classic'
}

const SIZE_ORDER: RoomSize[] = ['compact', 'normal', 'expansive']

/** Tredje træk — rumskala (påvirker bounds/tåge). */
export function drawRoomSize(rng: () => number): RoomSize {
  const total = SIZE_ORDER.reduce((s, k) => s + SIZE_WEIGHTS[k], 0)
  let r = rng() * total
  for (const k of SIZE_ORDER) {
    const w = SIZE_WEIGHTS[k]
    if (r < w) return k
    r -= w
  }
  return 'normal'
}

function floorYFromBase(base: CaveConfig): number {
  const o = base.oreSlots[0]
  return o ? o[1] : 0.48
}

export type RoomLayoutResult = Pick<
  CaveConfig,
  | 'oreSlots'
  | 'bounds'
  | 'boundsHalfX'
  | 'boundsHalfZ'
  | 'fogNear'
  | 'fogFar'
  | 'template'
  | 'size'
>

/**
 * Geometri + felter for ét lag fra skabelon og størrelse (felt-RNG kommer derefter i `mineLayer`).
 */
export function computeRoomLayout(args: {
  base: CaveConfig
  template: RoomTemplate
  size: RoomSize
  slotCount: number
}): RoomLayoutResult {
  const sm = ROOM_SIZE_WORLD_MUL[args.size]
  const baseB = args.base.bounds
  const fy = floorYFromBase(args.base)
  const B = baseB * sm

  let oreSlots: [number, number, number][]
  let hx: number
  let hz: number

  switch (args.template) {
    case 'classic': {
      const jMul = args.size === 'compact' ? 1.05 : args.size === 'expansive' ? 1.12 : 1.08
      const j = B * 0.068 * jMul
      oreSlots = scaleClassicOreSlots(args.base.oreSlots, args.slotCount).map(
        ([x, _y, z], i) =>
          [x * sm + oreSlotLayoutUnit(i, 50) * j, fy, z * sm + oreSlotLayoutUnit(i, 51) * j] as [
            number,
            number,
            number,
          ],
      )
      hx = B
      hz = B
      let maxClassicAx = 0
      let maxClassicAz = 0
      for (const [ox, , oz] of oreSlots) {
        maxClassicAx = Math.max(maxClassicAx, Math.abs(ox))
        maxClassicAz = Math.max(maxClassicAz, Math.abs(oz))
      }
      hx = Math.max(hx, maxClassicAx + INTERACTIVE_ORE_MESH_PAD)
      hz = Math.max(hz, maxClassicAz + INTERACTIVE_ORE_MESH_PAD)
      break
    }
    case 'corridor': {
      oreSlots = []
      hx = B * 0.58
      hz = B * 1.32
      const wobble = B * (args.size === 'compact' ? 0.12 : args.size === 'expansive' ? 0.11 : 0.1)
      for (let i = 0; i < args.slotCount; i++) {
        const frac = args.slotCount === 1 ? 0.5 : ((i + 1) * PHI) % 1
        const z = (frac - 0.5) * 2 * hz * 0.78
        const x = oreSlotLayoutUnit(i, 1) * hx * 0.7 + oreSlotLayoutUnit(i, 2) * wobble
        const z2 = z + oreSlotLayoutUnit(i, 3) * hz * 0.1
        oreSlots.push([x, fy, z2])
      }
      break
    }
    case 'island': {
      oreSlots = []
      const rx = B * 0.82
      const rz = B * 0.86
      const n = args.slotCount
      const angJ = args.size === 'compact' ? 0.42 : args.size === 'expansive' ? 0.38 : 0.36
      const radJ = args.size === 'compact' ? 0.13 : args.size === 'expansive' ? 0.12 : 0.11
      for (let i = 0; i < n; i++) {
        const frac = n === 1 ? 0.5 : ((i + 1) * PHI) % 1
        const a = frac * Math.PI * 2 + 0.13 + oreSlotLayoutUnit(i, 7) * angJ
        const radScale = 0.92 * (1 + oreSlotLayoutUnit(i, 8) * radJ)
        oreSlots.push([
          Math.cos(a) * rx * radScale + oreSlotLayoutUnit(i, 9) * rx * 0.09,
          fy,
          Math.sin(a) * rz * radScale + oreSlotLayoutUnit(i, 10) * rz * 0.09,
        ])
      }
      let maxIslandAx = 0
      let maxIslandAz = 0
      for (const [ox, , oz] of oreSlots) {
        maxIslandAx = Math.max(maxIslandAx, Math.abs(ox))
        maxIslandAz = Math.max(maxIslandAz, Math.abs(oz))
      }
      hx = Math.max(rx * 1.08, maxIslandAx + INTERACTIVE_ORE_MESH_PAD)
      hz = Math.max(rz * 1.08, maxIslandAz + INTERACTIVE_ORE_MESH_PAD)
      break
    }
    case 'dogleg': {
      oreSlots = []
      const n = args.slotCount
      const arm = B * 0.55
      const elbowZ = arm * 0.95
      /* Gangsti med afrundet hjørne + stærk 2D-spred (uafhængig af kurven), så malm/kister ikke
       * læser som ét sammenhængende L eller en enkelt række — gælder alle rumstørrelser. */
      const z0 = -elbowZ * 0.35
      const xEnd = arm * 1.18
      const straight1 = elbowZ - z0
      const rMax = Math.min(arm * 0.24, straight1 * 0.28, xEnd * 0.38)
      const r = Math.max(arm * 0.06, rMax)
      const cx = r
      const cz = elbowZ - r
      const arcLen = (Math.PI / 2) * r
      const len1 = Math.max(0, straight1 - r)
      const len2 = Math.max(0, xEnd - r)
      const Ltot = len1 + arcLen + len2
      const sizeMul =
        args.size === 'compact' ? 1.34 : args.size === 'expansive' ? 1.32 : 1.14
      const jPerp = arm * 0.16 * sizeMul
      const jAlong = arm * 0.1 * sizeMul
      const fillAmp =
        arm *
        (args.size === 'compact' ? 0.4 : args.size === 'expansive' ? 0.37 : 0.33)

      for (let k = 0; k < n; k++) {
        const frac = ((k + 1) * PHI) % 1
        let dist = frac * Ltot
        let x = 0
        let z = 0
        if (dist < len1) {
          const u = len1 < 1e-9 ? 0.5 : dist / len1
          x = oreSlotLayoutUnit(k, 1) * jPerp
          z = z0 + u * len1 + oreSlotLayoutUnit(k, 2) * jAlong
        } else if (dist < len1 + arcLen) {
          const u = arcLen < 1e-9 ? 0.5 : (dist - len1) / arcLen
          const theta = Math.PI - u * (Math.PI / 2)
          x = cx + r * Math.cos(theta) + oreSlotLayoutUnit(k, 5) * jPerp * 0.85
          z = cz + r * Math.sin(theta) + oreSlotLayoutUnit(k, 6) * jAlong * 0.85
        } else {
          dist -= len1 + arcLen
          const u = len2 < 1e-9 ? 0.5 : dist / len2
          x = r + u * len2 + oreSlotLayoutUnit(k, 3) * jAlong
          z = elbowZ + oreSlotLayoutUnit(k, 4) * jPerp
        }
        x += oreSlotLayoutUnit(k, 40) * fillAmp
        z += oreSlotLayoutUnit(k, 41) * fillAmp
        oreSlots.push([x, fy, z])
      }
      hx = Math.max(arm * 1.28, elbowZ * 0.35)
      hz = Math.max(elbowZ * 1.12, arm * 0.55)
      let maxOreAx = 0
      let maxOreAz = 0
      for (const [ox, , oz] of oreSlots) {
        maxOreAx = Math.max(maxOreAx, Math.abs(ox))
        maxOreAz = Math.max(maxOreAz, Math.abs(oz))
      }
      hx = Math.max(hx, maxOreAx + INTERACTIVE_ORE_MESH_PAD)
      hz = Math.max(hz, maxOreAz + INTERACTIVE_ORE_MESH_PAD)
      break
    }
  }

  const bounds = Math.max(hx, hz)
  const fogMul = args.size === 'compact' ? 0.96 : args.size === 'expansive' ? 1.06 : 1

  return {
    oreSlots,
    bounds,
    boundsHalfX: hx,
    boundsHalfZ: hz,
    fogNear: args.base.fogNear * fogMul,
    fogFar: args.base.fogFar * fogMul,
    template: args.template,
    size: args.size,
  }
}

/**
 * Classic-layout: baseline `oreSlots` fra område samples til præcis `targetCount` punkter
 * ved jævn fordeling langs den lukkede polygon-perimeter i XZ (Y interpoleres langs kanter).
 */
export function scaleClassicOreSlots(
  baseSlots: readonly [number, number, number][],
  targetCount: number,
): [number, number, number][] {
  if (targetCount <= 0) return []
  const m = baseSlots.length
  if (m === 0) return []

  if (targetCount === m) {
    return baseSlots.map((p) => [p[0], p[1], p[2]] as [number, number, number])
  }

  let cx = 0
  let cz = 0
  for (const p of baseSlots) {
    cx += p[0]
    cz += p[2]
  }
  cx /= m
  cz /= m

  const sorted = [...baseSlots].sort(
    (a, b) => Math.atan2(a[2] - cz, a[0] - cx) - Math.atan2(b[2] - cz, b[0] - cx),
  )

  if (sorted.length < 3) {
    const r = Math.max(4, ...sorted.map((p) => Math.hypot(p[0] - cx, p[2] - cz)))
    return Array.from({ length: targetCount }, (_, i) => {
      const a = (i / targetCount) * Math.PI * 2
      return [cx + Math.cos(a) * r, sorted[0]![1], cz + Math.sin(a) * r] as [number, number, number]
    })
  }

  type Edge = {
    from: [number, number, number]
    to: [number, number, number]
    len: number
  }
  const edges: Edge[] = []
  for (let i = 0; i < sorted.length; i++) {
    const from = sorted[i]!
    const to = sorted[(i + 1) % sorted.length]!
    const dx = to[0] - from[0]
    const dz = to[2] - from[2]
    edges.push({ from, to, len: Math.hypot(dx, dz) })
  }

  const total = edges.reduce((s, e) => s + e.len, 0)
  if (total < 1e-6) {
    const r = 5
    return Array.from({ length: targetCount }, (_, i) => {
      const a = (i / targetCount) * Math.PI * 2
      return [cx + Math.cos(a) * r, sorted[0]![1], cz + Math.sin(a) * r] as [number, number, number]
    })
  }

  const out: [number, number, number][] = []
  for (let k = 0; k < targetCount; k++) {
    let distAlong = ((k + 0.5) / targetCount) * total
    let placed = false
    for (let ei = 0; ei < edges.length; ei++) {
      const e = edges[ei]!
      if (distAlong <= e.len + 1e-9 || ei === edges.length - 1) {
        const t = Math.min(1, distAlong / Math.max(e.len, 1e-9))
        const x = e.from[0] + (e.to[0] - e.from[0]) * t
        const z = e.from[2] + (e.to[2] - e.from[2]) * t
        const y = e.from[1] + (e.to[1] - e.from[1]) * t
        out.push([x, y, z])
        placed = true
        break
      }
      distAlong -= e.len
    }
    if (!placed && edges[0]) {
      const e = edges[0]
      out.push([e.from[0], e.from[1], e.from[2]])
    }
  }
  return out
}

export type ResolveEffectiveCaveConfigArgs = {
  area: Area
  runId: string
  mineId: string
  currentDepth: number
}

/**
 * Effektiv grotte for det aktuelle lag: samme layout som `generateLayerState` skal bruge.
 * RNG: slotCount → skabelon → størrelse → geometri (felt-RNG følger i `generateLayerState`).
 */
export function resolveEffectiveCaveConfig(args: ResolveEffectiveCaveConfigArgs): CaveConfig {
  const base = getCaveConfig(args.area)
  const rng = mulberry32(hashStringToSeed(mineLayerSeedKey(args.runId, args.mineId, args.currentDepth)))
  const slotCount = drawInteractiveSlotCount(rng)
  const template = drawRoomTemplate(rng)
  const size = drawRoomSize(rng)
  const layout = computeRoomLayout({ base, template, size, slotCount })
  return {
    ...base,
    ...layout,
  }
}
