import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import type { Group, Mesh } from 'three'
import * as THREE from 'three'
import type { ChestTier } from '../../../types'
import type { ChestLootResult } from '../../../gem/mining'

export type WorldChestEntity = {
  id: string
  slotIndex: number
  position: [number, number, number]
  tier: ChestTier
  remainingLoot: ChestLootResult
  opened: boolean
}

type MatPreset = {
  base: { color: string; roughness: number; metalness: number }
  trim: { color: string; roughness: number; metalness: number }
}

const TIER_PRESET: Record<ChestTier, MatPreset> = {
  wood: {
    base: { color: '#4a3020', roughness: 0.85, metalness: 0.05 },
    trim: { color: '#cd7f32', roughness: 0.4, metalness: 0.8 },
  },
  silver: {
    base: { color: '#222222', roughness: 0.7, metalness: 0.2 },
    trim: { color: '#b0b0b0', roughness: 0.3, metalness: 0.9 },
  },
  gold: {
    base: { color: '#5a0a0a', roughness: 0.6, metalness: 0.1 },
    trim: { color: '#ffd700', roughness: 0.2, metalness: 1.0 },
  },
}

type Props = {
  entity: WorldChestEntity
  highlighted: boolean
  registerHitMesh?: (id: string, mesh: Mesh | null) => void
  onClick: (id: string) => void
}

const WIDTH = 0.85
const DEPTH = 0.65
const HEIGHT = 0.55
const BODY_H = 0.35
const LID_H = HEIGHT - BODY_H
const T = 0.04
const BAND_W = 0.08
const BAND_T = 0.015
const BAND_OFF = WIDTH / 2 - 0.15

export default function WorldChest({ entity, highlighted, registerHitMesh, onClick }: Props) {
  const preset = TIER_PRESET[entity.tier]
  const hingeRef = useRef<Group>(null)

  const empty =
    entity.remainingLoot.gold <= 0 &&
    entity.remainingLoot.items.length === 0 &&
    !entity.remainingLoot.blueprintId

  const ghost = empty && entity.opened

  const trimEmissive = useMemo(() => {
    const c = new THREE.Color(preset.trim.color)
    return highlighted ? c : new THREE.Color('#000000')
  }, [highlighted, preset.trim.color])

  const openChest = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onClick(entity.id)
  }

  const evt = { onPointerDown: openChest, onClick: openChest }

  const targetHinge = entity.opened ? -Math.PI / 2.2 : 0

  useFrame(() => {
    const h = hingeRef.current
    if (!h) return
    h.rotation.x += (targetHinge - h.rotation.x) * 0.08
  })

  return (
    <group position={entity.position}>
      {/* Usynlig træfflade — ét mesh pr. kiste til raycast i cave */}
      <mesh ref={(n) => registerHitMesh?.(entity.id, n)} position={[0, HEIGHT / 2, 0]}>
        <boxGeometry args={[WIDTH * 1.02, HEIGHT * 1.05, DEPTH * 1.05]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>

      <group>
        <group>
          {/* Bund */}
          <mesh castShadow receiveShadow {...evt} position={[0, T / 2, 0]}>
            <boxGeometry args={[WIDTH, T, DEPTH]} />
            <meshStandardMaterial
              color={preset.base.color}
              roughness={preset.base.roughness}
              metalness={preset.base.metalness}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          {/* Forkant */}
          <mesh castShadow receiveShadow {...evt} position={[0, T + (BODY_H - T) / 2, DEPTH / 2 - T / 2]}>
            <boxGeometry args={[WIDTH, BODY_H - T, T]} />
            <meshStandardMaterial
              color={preset.base.color}
              roughness={preset.base.roughness}
              metalness={preset.base.metalness}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          {/* Bagside */}
          <mesh castShadow receiveShadow {...evt} position={[0, T + (BODY_H - T) / 2, -DEPTH / 2 + T / 2]}>
            <boxGeometry args={[WIDTH, BODY_H - T, T]} />
            <meshStandardMaterial
              color={preset.base.color}
              roughness={preset.base.roughness}
              metalness={preset.base.metalness}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          {/* Venstre */}
          <mesh castShadow receiveShadow {...evt} position={[-WIDTH / 2 + T / 2, T + (BODY_H - T) / 2, 0]}>
            <boxGeometry args={[T, BODY_H - T, DEPTH - 2 * T]} />
            <meshStandardMaterial
              color={preset.base.color}
              roughness={preset.base.roughness}
              metalness={preset.base.metalness}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          {/* Højre */}
          <mesh castShadow receiveShadow {...evt} position={[WIDTH / 2 - T / 2, T + (BODY_H - T) / 2, 0]}>
            <boxGeometry args={[T, BODY_H - T, DEPTH - 2 * T]} />
            <meshStandardMaterial
              color={preset.base.color}
              roughness={preset.base.roughness}
              metalness={preset.base.metalness}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>

          {/* Kropsbånd */}
          <mesh castShadow receiveShadow {...evt} position={[-BAND_OFF, BODY_H / 2, DEPTH / 2 + BAND_T / 2]}>
            <boxGeometry args={[BAND_W, BODY_H, BAND_T]} />
            <meshStandardMaterial
              color={preset.trim.color}
              roughness={preset.trim.roughness}
              metalness={preset.trim.metalness}
              emissive={trimEmissive}
              emissiveIntensity={highlighted ? 0.35 : 0}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          <mesh castShadow receiveShadow {...evt} position={[-BAND_OFF, BODY_H / 2, -DEPTH / 2 - BAND_T / 2]}>
            <boxGeometry args={[BAND_W, BODY_H, BAND_T]} />
            <meshStandardMaterial
              color={preset.trim.color}
              roughness={preset.trim.roughness}
              metalness={preset.trim.metalness}
              emissive={trimEmissive}
              emissiveIntensity={highlighted ? 0.35 : 0}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          <mesh castShadow receiveShadow {...evt} position={[BAND_OFF, BODY_H / 2, DEPTH / 2 + BAND_T / 2]}>
            <boxGeometry args={[BAND_W, BODY_H, BAND_T]} />
            <meshStandardMaterial
              color={preset.trim.color}
              roughness={preset.trim.roughness}
              metalness={preset.trim.metalness}
              emissive={trimEmissive}
              emissiveIntensity={highlighted ? 0.35 : 0}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
          <mesh castShadow receiveShadow {...evt} position={[BAND_OFF, BODY_H / 2, -DEPTH / 2 - BAND_T / 2]}>
            <boxGeometry args={[BAND_W, BODY_H, BAND_T]} />
            <meshStandardMaterial
              color={preset.trim.color}
              roughness={preset.trim.roughness}
              metalness={preset.trim.metalness}
              emissive={trimEmissive}
              emissiveIntensity={highlighted ? 0.35 : 0}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
        </group>

        <group ref={hingeRef} position={[0, BODY_H, -DEPTH / 2]}>
          <group position={[0, LID_H / 2, DEPTH / 2]}>
            <mesh castShadow receiveShadow {...evt} position={[0, LID_H / 2 - T / 2, 0]}>
              <boxGeometry args={[WIDTH, T, DEPTH]} />
              <meshStandardMaterial
                color={preset.base.color}
                roughness={preset.base.roughness}
                metalness={preset.base.metalness}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[0, -T / 2, DEPTH / 2 - T / 2]}>
              <boxGeometry args={[WIDTH, LID_H - T, T]} />
              <meshStandardMaterial
                color={preset.base.color}
                roughness={preset.base.roughness}
                metalness={preset.base.metalness}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[0, -T / 2, -DEPTH / 2 + T / 2]}>
              <boxGeometry args={[WIDTH, LID_H - T, T]} />
              <meshStandardMaterial
                color={preset.base.color}
                roughness={preset.base.roughness}
                metalness={preset.base.metalness}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[-WIDTH / 2 + T / 2, -T / 2, 0]}>
              <boxGeometry args={[T, LID_H - T, DEPTH - 2 * T]} />
              <meshStandardMaterial
                color={preset.base.color}
                roughness={preset.base.roughness}
                metalness={preset.base.metalness}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[WIDTH / 2 - T / 2, -T / 2, 0]}>
              <boxGeometry args={[T, LID_H - T, DEPTH - 2 * T]} />
              <meshStandardMaterial
                color={preset.base.color}
                roughness={preset.base.roughness}
                metalness={preset.base.metalness}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>

            <mesh castShadow receiveShadow {...evt} position={[-BAND_OFF, 0, DEPTH / 2 + BAND_T / 2]}>
              <boxGeometry args={[BAND_W, LID_H, BAND_T]} />
              <meshStandardMaterial
                color={preset.trim.color}
                roughness={preset.trim.roughness}
                metalness={preset.trim.metalness}
                emissive={trimEmissive}
                emissiveIntensity={highlighted ? 0.35 : 0}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[-BAND_OFF, 0, -DEPTH / 2 - BAND_T / 2]}>
              <boxGeometry args={[BAND_W, LID_H, BAND_T]} />
              <meshStandardMaterial
                color={preset.trim.color}
                roughness={preset.trim.roughness}
                metalness={preset.trim.metalness}
                emissive={trimEmissive}
                emissiveIntensity={highlighted ? 0.35 : 0}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[-BAND_OFF, LID_H / 2 + BAND_T / 2, 0]}>
              <boxGeometry args={[BAND_W, BAND_T, DEPTH + 2 * BAND_T]} />
              <meshStandardMaterial
                color={preset.trim.color}
                roughness={preset.trim.roughness}
                metalness={preset.trim.metalness}
                emissive={trimEmissive}
                emissiveIntensity={highlighted ? 0.35 : 0}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[BAND_OFF, 0, DEPTH / 2 + BAND_T / 2]}>
              <boxGeometry args={[BAND_W, LID_H, BAND_T]} />
              <meshStandardMaterial
                color={preset.trim.color}
                roughness={preset.trim.roughness}
                metalness={preset.trim.metalness}
                emissive={trimEmissive}
                emissiveIntensity={highlighted ? 0.35 : 0}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[BAND_OFF, 0, -DEPTH / 2 - BAND_T / 2]}>
              <boxGeometry args={[BAND_W, LID_H, BAND_T]} />
              <meshStandardMaterial
                color={preset.trim.color}
                roughness={preset.trim.roughness}
                metalness={preset.trim.metalness}
                emissive={trimEmissive}
                emissiveIntensity={highlighted ? 0.35 : 0}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
            <mesh castShadow receiveShadow {...evt} position={[BAND_OFF, LID_H / 2 + BAND_T / 2, 0]}>
              <boxGeometry args={[BAND_W, BAND_T, DEPTH + 2 * BAND_T]} />
              <meshStandardMaterial
                color={preset.trim.color}
                roughness={preset.trim.roughness}
                metalness={preset.trim.metalness}
                emissive={trimEmissive}
                emissiveIntensity={highlighted ? 0.35 : 0}
                transparent={ghost}
                opacity={ghost ? 0.65 : 1}
              />
            </mesh>
          </group>

          <mesh castShadow receiveShadow {...evt} position={[0, LID_H / 4, DEPTH + 0.02]}>
            <boxGeometry args={[0.12, 0.15, 0.04]} />
            <meshStandardMaterial
              color={preset.trim.color}
              roughness={preset.trim.roughness}
              metalness={preset.trim.metalness}
              emissive={trimEmissive}
              emissiveIntensity={highlighted ? 0.35 : 0}
              transparent={ghost}
              opacity={ghost ? 0.65 : 1}
            />
          </mesh>
        </group>
      </group>
    </group>
  )
}
