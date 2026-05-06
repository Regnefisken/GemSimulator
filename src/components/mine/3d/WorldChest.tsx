import type { ThreeEvent } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { ChestTier } from '../../../types'
import type { ChestLootResult } from '../../../gem/mining'

export type WorldChestEntity = {
  id: string
  position: [number, number, number]
  tier: ChestTier
  remainingLoot: ChestLootResult
  opened: boolean
}

const TIER_BODY: Record<ChestTier, string> = {
  wood: '#7c4e1e',
  silver: '#475569',
  gold: '#713f12',
}

const TIER_TRIM: Record<ChestTier, string> = {
  wood: '#b8922a',
  silver: '#cbd5e1',
  gold: '#fbbf24',
}

type Props = {
  entity: WorldChestEntity
  highlighted: boolean
  registerHitMesh?: (id: string, mesh: Mesh | null) => void
  onClick: (id: string) => void
}

export default function WorldChest({ entity, highlighted, registerHitMesh, onClick }: Props) {
  const empty =
    entity.remainingLoot.gold <= 0 &&
    entity.remainingLoot.items.length === 0 &&
    !entity.remainingLoot.blueprintId

  const openChest = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    onClick(entity.id)
  }

  const body = TIER_BODY[entity.tier]
  const trim = TIER_TRIM[entity.tier]

  return (
    <group position={entity.position}>
      <mesh ref={(n) => registerHitMesh?.(entity.id, n)} castShadow onPointerDown={openChest} onClick={openChest}>
        <boxGeometry args={[0.85, 0.55, 0.65]} />
        <meshStandardMaterial
          color={body}
          roughness={0.65}
          metalness={0.2}
          emissive={highlighted ? trim : '#000000'}
          emissiveIntensity={highlighted ? 0.35 : 0}
          transparent={empty && entity.opened}
          opacity={empty && entity.opened ? 0.65 : 1}
        />
      </mesh>
      <mesh
        position={[0, 0.35, 0.33]}
        rotation={[entity.opened ? -0.85 : 0, 0, 0]}
        onPointerDown={openChest}
        onClick={openChest}
      >
        <boxGeometry args={[0.82, 0.12, 0.62]} />
        <meshStandardMaterial color={trim} roughness={0.5} metalness={0.35} />
      </mesh>
    </group>
  )
}
