import { useMemo, useRef, useEffect, type MutableRefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group, Mesh } from 'three'
import type { MetalName, RockType } from '../../../types'

type Props = {
  position: [number, number, number]
  hp: number
  maxHp: number
  hitPulse: number
  rockType: RockType
  disabled?: boolean
  /** Kun aktiv node hugger ved klik */
  interactive: boolean
  onMineHit?: () => void
  /** Klik på ikke-aktiv (men ikke ryddet) klippe → vælg den som mål */
  onSelectTarget?: () => void
  /** Dominant metal til svag emissive (aktiv node) */
  accentMetal?: MetalName
  /** Kun aktiv node: raycast hit-mod mesh */
  hitTargetRef?: MutableRefObject<Mesh | null>
  /** Hugget ud — ingen synlig bund under verdens-loot */
  depleted?: boolean
}

const ROCK_TYPE_COLOR: Record<RockType, [number, number]> = {
  normal: [28, 24],
  hard: [220, 10],
  rich: [38, 55],
  crystal: [185, 55],
  chest: [28, 24],
}

/** Groft metal → accent til små årer */
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

export default function OreNode({
  position,
  hp,
  maxHp,
  hitPulse,
  rockType,
  disabled,
  interactive,
  onMineHit,
  onSelectTarget,
  accentMetal,
  hitTargetRef,
  depleted,
}: Props) {
  const meshRef = useRef<Group>(null)
  const shake = useRef(0)
  const pct = interactive && maxHp > 0 ? hp / maxHp : 1
  const isLowHp = interactive && pct < 0.25

  useEffect(() => {
    if (!interactive && hitTargetRef) hitTargetRef.current = null
  }, [interactive, hitTargetRef])

  useEffect(() => {
    if (!interactive) return
    shake.current = Math.min(1, shake.current + (isLowHp ? 1.2 : 0.9))
  }, [hitPulse, isLowHp, interactive])

  useFrame((_, delta) => {
    const m = meshRef.current
    if (!m) return
    if (!interactive) {
      m.rotation.set(0, 0, 0)
      m.position.set(0, 0, 0)
      return
    }
    shake.current *= Math.pow(0.92, delta * 50)
    const t = performance.now() * 0.008
    const amp = isLowHp ? shake.current * 1.5 : shake.current
    m.rotation.z = Math.sin(t) * 0.07 * amp
    m.rotation.x = Math.cos(t * 1.1) * 0.06 * amp
    m.position.x = Math.sin(t * 2) * 0.09 * amp
    m.position.y = Math.cos(t * 1.7) * 0.04 * amp
  })

  const [hue, sat] = ROCK_TYPE_COLOR[rockType]

  const color = useMemo(() => {
    if (!interactive) {
      return 'hsl(25, 12%, 28%)'
    }
    const l = Math.max(0.16, pct * 0.38 + 0.14)
    return `hsl(${hue}, ${sat}%, ${l * 100}%)`
  }, [pct, hue, sat, interactive])

  const emissiveInteractive = isLowHp ? '#ff2200' : accentMetal ? METAL_ACCENT[accentMetal] ?? '#332211' : '#000000'
  const emissiveIntensity =
    !interactive ? 0 : isLowHp ? 0.45 * (1 - pct / 0.25) : accentMetal ? 0.12 : 0

  if (depleted) {
    return (
      <group position={position}>
        <group ref={meshRef} />
      </group>
    )
  }

  const pickable = interactive || Boolean(onSelectTarget)

  return (
    <group position={position}>
      <group ref={meshRef}>
        {pickable ? (
          <mesh
            ref={(node) => {
              if (hitTargetRef) {
                hitTargetRef.current = interactive && node ? node : null
              }
            }}
            onClick={(e) => {
              e.stopPropagation()
              if (interactive && !disabled && onMineHit) {
                onMineHit()
                return
              }
              if (!interactive && onSelectTarget) {
                onSelectTarget()
              }
            }}
            onPointerDown={(e) => {
              if (interactive || onSelectTarget) e.stopPropagation()
            }}
          >
            <boxGeometry args={[1.1, 0.95, 1.05]} />
            <meshStandardMaterial
              color={color}
              roughness={interactive ? (isLowHp ? 0.65 : 0.88) : 0.92}
              metalness={interactive ? 0.1 : 0.04}
              emissive={interactive ? emissiveInteractive : '#000000'}
              emissiveIntensity={emissiveIntensity}
            />
          </mesh>
        ) : (
          <mesh>
            <boxGeometry args={[1.1, 0.95, 1.05]} />
            <meshStandardMaterial
              color={color}
              roughness={0.92}
              metalness={0.04}
              emissive="#000000"
              emissiveIntensity={0}
            />
          </mesh>
        )}
      </group>
    </group>
  )
}
