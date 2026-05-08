import { useMemo, useRef, useEffect, type MutableRefObject } from 'react'
import { Billboard, Html } from '@react-three/drei'
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
  mob: [310, 72],
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

  const pickable = interactive || Boolean(onSelectTarget) || Boolean(onMineHit)

  const hpPct = maxHp > 0 ? Math.max(0, (hp / maxHp) * 100) : 0
  const nameLabel = rockType === 'mob' ? 'Uhyre' : 'Klippe'
  const barGradient =
    rockType === 'mob'
      ? 'bg-gradient-to-r from-fuchsia-950 to-fuchsia-400'
      : 'bg-gradient-to-r from-amber-800 to-amber-400'

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
                return
              }
              if (!interactive && onMineHit && !onSelectTarget && !disabled) {
                onMineHit()
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
      {interactive && !depleted && (
        <group>
          <Billboard follow position={[0, 1.02, 0]}>
            <Html center distanceFactor={10} transform style={{ pointerEvents: 'none' }}>
              <div className="flex flex-col items-center gap-0.5 select-none [transform:translateZ(0)]">
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
          </Billboard>
        </group>
      )}
    </group>
  )
}
