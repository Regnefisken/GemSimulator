import { useMemo, useRef, useEffect, useLayoutEffect, type MutableRefObject } from 'react'
import { Billboard, Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Group, Object3D } from 'three'
import type { MetalName, MobType, RockType } from '../../../types'
import {
  createBaseRockGeometry,
  createCrystalRockCluster,
  createHardRockGeometry,
  createRichRockGeometry,
} from '../../../gem/procedural/buildProceduralMineRock'
import { useLabelHtmlDistanceFactor } from './useLabelHtmlDistanceFactor'
import SeamSkulkerMob, { seamSkulkerHpLabelLocalY } from './seamSkulker/SeamSkulkerMob'

/** Under denne afstand (verdensenheder) skaleres `distanceFactor` ned — undgår enorm CSS-scale tæt på. */
const LABEL_HTML_MIN_WORLD_DISTANCE = 3.25
/** Drei: `scale ≈ objectScale * distanceFactor`; loft på produktet holder tekst/bar skarp (især uden `transform`). */
const LABEL_HTML_MAX_CSS_SCALE = 2.65
const LABEL_HTML_BASE_DISTANCE_FACTOR = 10

type Props = {
  position: [number, number, number]
  hp: number
  maxHp: number
  hitPulse: number
  rockType: RockType
  /** Deterministisk frø — samme felt ser ens ud på tværs af sessions (hash af run/slot). */
  visualSeed: number
  disabled?: boolean
  interactive: boolean
  onMineHit?: () => void
  onSelectTarget?: () => void
  accentMetal?: MetalName
  hitTargetRef?: MutableRefObject<Object3D | null>
  depleted?: boolean
  /** 1 = standard; fra `getRockLayoutParams` — skalerer mesh relativt til ROCK_BULK × global skala. */
  meshScaleMultiplier?: number
  /** Fra `getRockLayoutParams`; bruges til HP‑højde vs nedsænkning (typisk ≤ 0). */
  extraSinkY?: number
  /** Kun mob-felt: kosmetisk variant. */
  mobType?: MobType
  /** Player/mob bevægelsesgrænse — halve udstrækninger i X/Z (matcher `CaveConfig.boundsHalf*` / `bounds`). */
  caveHalfX?: number
  caveHalfZ?: number
  /** Aktivt mål-mob: skade ved slag (animation). */
  onMobStrikeHit?: () => void
}

const ROCK_TYPE_COLOR: Record<RockType, [number, number]> = {
  normal: [28, 24],
  hard: [220, 10],
  rich: [38, 55],
  crystal: [185, 55],
  chest: [28, 24],
  mob: [310, 72],
}

const IDLE_SURFACE_LIGHT: Record<RockType, number> = {
  normal: 27,
  hard: 23,
  rich: 31,
  crystal: 38,
  chest: 27,
  mob: 33,
}

const IDLE_SAT_FACTOR: Record<RockType, number> = {
  normal: 1,
  hard: 0.75,
  rich: 1.12,
  crystal: 1.18,
  chest: 1,
  mob: 1.08,
}

const ROCK_BULK: Record<RockType, number> = {
  normal: 1,
  hard: 0.93,
  rich: 1.06,
  crystal: 1,
  chest: 1,
  mob: 1.04,
}

/** Fælles ~20% op-skala så klippen fylder bedre mod grobund (mindre «svæv» set fra spilleren). */
const ROCK_MESH_GLOBAL_SCALE = 1.2

/** Navn/HP: basis lod over reference‑klip (normal + global skala). */
const LABEL_BILLBOARD_BASE_Y = 1.32
/** `LABEL_BILLBOARD_BASE_Y` ganges med `bulk /` denne (så størrelse + type følger med). */
const LABEL_REF_BULK = ROCK_BULK.normal * ROCK_MESH_GLOBAL_SCALE
/** Ekstra fordybning (`extraSinkY` negativ) giver yderligere lod (nedsænkning). */
const LABEL_SINK_SCALE_PER_UNIT = 1.55

function rockSurfaceColor(rockType: RockType, interactive: boolean, pct: number): string {
  const [hue, sat] = ROCK_TYPE_COLOR[rockType]
  if (!interactive) {
    const L = IDLE_SURFACE_LIGHT[rockType]
    const s = Math.min(72, sat * IDLE_SAT_FACTOR[rockType])
    return `hsl(${hue}, ${s}%, ${L}%)`
  }
  const l = Math.max(0.16, pct * 0.38 + 0.14)
  return `hsl(${hue}, ${sat}%, ${l * 100}%)`
}

function idleRockEmissive(rockType: RockType): { color: string; intensity: number } {
  switch (rockType) {
    case 'crystal':
      return { color: '#7dd3fc', intensity: 0.09 }
    case 'rich':
      return { color: '#eab308', intensity: 0.07 }
    case 'mob':
      return { color: '#e879f9', intensity: 0.06 }
    default:
      return { color: '#000000', intensity: 0 }
  }
}

const METAL_ACCENT: Partial<Record<MetalName, string>> = {
  Tin: '#b8c4d4',
  Kobber: '#c97a50',
  Jern: '#8b7355',
  Sølv: '#d8e0ea',
  Titanium: '#a8b0c8',
  Guld: '#e8c040',
  Platin: '#e0e8f0',
  Mithril: '#a8e0ff',
  Runestål: '#c8b8ff',
}

type RockPayload =
  | { kind: 'single'; geometry: THREE.BufferGeometry }
  | { kind: 'rich'; geometry: THREE.BufferGeometry }
  | {
      kind: 'crystal'
      hostGeometry: THREE.BufferGeometry
      shards: import('../../../gem/procedural/buildProceduralMineRock').CrystalShard[]
    }

export default function OreNode({
  position,
  hp,
  maxHp,
  hitPulse,
  rockType,
  visualSeed,
  disabled,
  interactive,
  onMineHit,
  onSelectTarget,
  accentMetal,
  hitTargetRef,
  depleted,
  meshScaleMultiplier = 1,
  extraSinkY = 0,
  caveHalfX = 9,
  caveHalfZ = 9,
  onMobStrikeHit,
  mobType,
}: Props) {
  const meshRef = useRef<Group>(null)
  const shake = useRef(0)
  const pct = interactive && maxHp > 0 ? hp / maxHp : 1
  const isLowHp = interactive && pct < 0.25

  const richBlendBase = useMemo(() => new THREE.Color(rockSurfaceColor(rockType, false, 1)), [rockType])

  const rockPayload = useMemo((): RockPayload | null => {
    if (rockType === 'mob') return null
    switch (rockType) {
      case 'hard':
        return { kind: 'single', geometry: createHardRockGeometry(visualSeed) }
      case 'rich':
        return {
          kind: 'rich',
          geometry: createRichRockGeometry(visualSeed, richBlendBase.clone()),
        }
      case 'crystal': {
        const { hostGeometry, shards } = createCrystalRockCluster(visualSeed)
        return { kind: 'crystal', hostGeometry, shards }
      }
      default:
        return { kind: 'single', geometry: createBaseRockGeometry(visualSeed) }
    }
  }, [visualSeed, rockType, richBlendBase])

  useEffect(() => {
    if (!rockPayload) return
    return () => {
      if (rockPayload.kind === 'crystal') rockPayload.hostGeometry.dispose()
      else rockPayload.geometry.dispose()
    }
  }, [rockPayload])

  useLayoutEffect(() => {
    if (!hitTargetRef) return
    if (interactive && meshRef.current) {
      hitTargetRef.current = meshRef.current
      return () => {
        hitTargetRef.current = null
      }
    }
    hitTargetRef.current = null
  }, [interactive, hitTargetRef])

  useEffect(() => {
    if (!interactive) return
    shake.current = Math.min(1, shake.current + (isLowHp ? 1.2 : 0.9))
  }, [hitPulse, isLowHp, interactive])

  useFrame((_, delta) => {
    const m = meshRef.current
    if (m) {
      if (!interactive) {
        m.rotation.set(0, 0, 0)
        m.position.set(0, 0, 0)
      } else {
        shake.current *= Math.pow(0.92, delta * 50)
        const t = performance.now() * 0.008
        const amp = isLowHp ? shake.current * 1.5 : shake.current
        m.rotation.z = Math.sin(t) * 0.07 * amp
        m.rotation.x = Math.cos(t * 1.1) * 0.06 * amp
        m.position.x = Math.sin(t * 2) * 0.09 * amp
        m.position.y = Math.cos(t * 1.7) * 0.04 * amp
      }
    }
  })

  const color = useMemo(() => rockSurfaceColor(rockType, interactive, pct), [rockType, interactive, pct])

  const idleGlow = useMemo(() => idleRockEmissive(rockType), [rockType])

  const emissiveIntensity = !interactive
    ? idleGlow.intensity
    : isLowHp
      ? 0.45 * (1 - pct / 0.25)
      : accentMetal
        ? 0.12
        : idleGlow.intensity

  const emissiveColor = useMemo(() => {
    if (!interactive) return idleGlow.color
    if (isLowHp) return '#ff2200'
    if (accentMetal) return METAL_ACCENT[accentMetal] ?? '#332211'
    return idleGlow.color !== '#000000' ? idleGlow.color : '#000000'
  }, [interactive, isLowHp, accentMetal, idleGlow.color])

  const bulk = ROCK_BULK[rockType] * ROCK_MESH_GLOBAL_SCALE * meshScaleMultiplier
  const labelBillboardY =
    LABEL_BILLBOARD_BASE_Y *
    (bulk / LABEL_REF_BULK) *
    (1 + LABEL_SINK_SCALE_PER_UNIT * Math.max(0, -extraSinkY))
  const roughRock =
    rockType === 'hard' ? 0.94 : rockType === 'crystal' ? 0.78 : rockType === 'rich' ? 0.82 : 0.9
  const metalRock =
    rockType === 'crystal' ? 0.22 : rockType === 'rich' ? 0.18 : rockType === 'hard' ? 0.12 : 0.06

  const surfaceColorThree = useMemo(() => new THREE.Color(color), [color])

  const labelAnchorRef = useRef<Group>(null)
  const labelDistanceFactor = useLabelHtmlDistanceFactor(
    labelAnchorRef,
    LABEL_HTML_BASE_DISTANCE_FACTOR,
    LABEL_HTML_MIN_WORLD_DISTANCE,
    LABEL_HTML_MAX_CSS_SCALE,
  )

  if (depleted) {
    return (
      <group position={position}>
        <group ref={meshRef} />
      </group>
    )
  }

  const pickable = interactive || Boolean(onSelectTarget) || Boolean(onMineHit)

  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0
  const nameLabel = rockType === 'mob' ? 'Uhyre' : 'Klippe'
  const barGradient =
    rockType === 'mob'
      ? 'bg-gradient-to-r from-fuchsia-950 to-fuchsia-400'
      : 'bg-gradient-to-r from-amber-800 to-amber-400'

  const meshHandlers = pickable
    ? {
        onClick: (e: { stopPropagation: () => void }) => {
          e.stopPropagation()
          if (interactive && !disabled && onMineHit) {
            onMineHit()
            return
          }
          if (!interactive && onSelectTarget) {
            onSelectTarget()
            return
          }
          if (!interactive && onMineHit && !onSelectTarget && !disabled) {
            onMineHit()
          }
        },
        onPointerDown: (e: { stopPropagation: () => void }) => {
          if (interactive || onSelectTarget) e.stopPropagation()
        },
      }
    : {}

  const showHpBar = interactive && !depleted
  const hpBarWorldY =
    rockType === 'mob' ? seamSkulkerHpLabelLocalY(bulk) : labelBillboardY

  const hpBillboard = showHpBar ? (
      <group>
        <Billboard follow position={[0, hpBarWorldY, 0]}>
          <group ref={labelAnchorRef}>
            <Html
              center
              distanceFactor={labelDistanceFactor}
              zIndexRange={[3200, 120]}
              style={{ pointerEvents: 'none' }}
            >
              <div className="flex flex-col items-center gap-0.5 select-none">
                <span
                  className={
                    'text-[9px] font-bold uppercase tracking-wider drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)] ' +
                    (rockType === 'mob' ? 'text-fuchsia-100' : 'text-amber-100')
                  }
                >
                  {nameLabel}
                </span>
                <div className="h-[5px] w-[76px] rounded-full bg-black/55 ring-1 ring-white/15 overflow-hidden shadow-md">
                  <div
                    className={`h-full rounded-full ${barGradient}`}
                    style={{ width: `${hpPct}%` }}
                  />
                </div>
                <span className="text-[8px] font-mono tabular-nums text-slate-200/95 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                  {hp}/{maxHp}
                </span>
              </div>
            </Html>
          </group>
        </Billboard>
      </group>
    ) : null

  return (
    <group position={position}>
      <group ref={meshRef}>
        {rockType === 'mob' ? (
          <SeamSkulkerMob
            bulk={bulk}
            visualSeed={visualSeed}
            slotWorldX={position[0]}
            slotWorldZ={position[2]}
            caveHalfX={caveHalfX}
            caveHalfZ={caveHalfZ}
            mobType={mobType}
            onStrikeHit={interactive ? onMobStrikeHit : undefined}
            {...(pickable ? meshHandlers : {})}
          >
            {hpBillboard}
          </SeamSkulkerMob>
        ) : rockPayload ? (
          <group scale={[bulk, bulk, bulk]}>
            {rockPayload.kind === 'crystal' ? (
              <>
                <mesh
                  castShadow
                  receiveShadow
                  geometry={rockPayload.hostGeometry}
                  {...meshHandlers}
                >
                  <meshStandardMaterial
                    color="#1a1c20"
                    roughness={0.9}
                    metalness={0.02}
                    flatShading
                  />
                </mesh>
                {rockPayload.shards.map((s) => (
                  <mesh
                    key={s.id}
                    position={s.position}
                    rotation={s.euler}
                    scale={[1, s.stretchY, 1]}
                    castShadow
                    receiveShadow
                    {...meshHandlers}
                  >
                    <octahedronGeometry args={[s.radius, 0]} />
                    <meshStandardMaterial
                      color={s.color}
                      roughness={rockType === 'crystal' ? 0.38 : 0.5}
                      metalness={0.35}
                      emissive={s.color}
                      emissiveIntensity={0.06}
                      flatShading
                    />
                  </mesh>
                ))}
              </>
            ) : rockPayload.kind === 'rich' ? (
              <mesh castShadow receiveShadow geometry={rockPayload.geometry} {...meshHandlers}>
                <meshStandardMaterial
                  vertexColors
                  color="#ffffff"
                  roughness={interactive ? (isLowHp ? 0.5 : 0.56) : 0.62}
                  metalness={interactive ? 0.36 : 0.34}
                  emissive={emissiveColor}
                  emissiveIntensity={emissiveIntensity}
                  flatShading
                />
              </mesh>
            ) : (
              <mesh castShadow receiveShadow geometry={rockPayload.geometry} {...meshHandlers}>
                <meshStandardMaterial
                  color={surfaceColorThree}
                  roughness={interactive ? (isLowHp ? 0.65 : 0.88) : roughRock}
                  metalness={interactive ? 0.1 : metalRock}
                  emissive={emissiveColor}
                  emissiveIntensity={emissiveIntensity}
                  flatShading
                />
              </mesh>
            )}
          </group>
        ) : null}
      </group>
      {rockType !== 'mob' && hpBillboard}
    </group>
  )
}
