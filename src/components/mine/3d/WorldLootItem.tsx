import { type ThreeEvent, useFrame, useThree } from '@react-three/fiber'
import { useRef, useState } from 'react'
import * as THREE from 'three'
import type { WorldLootEntity } from '../../../lib/lootEntities'
import { getDropPixelData, WORLD_LOOT_BASE_SCALE, worldLootKindScale } from '../../../lib/lootEntities'
import type { MineDrop } from '../../../gem/mining'
import { METALS } from '../../../data/metals'
import VoxelMesh from '../../VoxelMesh'

type Props = {
  entity: WorldLootEntity
  onCollect: (id: string) => void
}

function isRareGlow(drop: MineDrop): boolean {
  if (drop.kind === 'gem') return true
  if (drop.kind === 'nugget') {
    const r = ['Sølv', 'Guld', 'Platin', 'Mithril', 'Runestål', 'Titanium']
    return r.includes(drop.nugget.metalName)
  }
  return false
}

function glowColor(drop: MineDrop): string {
  if (drop.kind === 'gem') return drop.gem.colorMap['G'] ?? '#f0abfc'
  if (drop.kind === 'nugget') return METALS[drop.nugget.metalName]?.pixelColor ?? '#e2e8f0'
  return '#fef08a'
}

export default function WorldLootItem({ entity, onCollect }: Props) {
  const { camera } = useThree()
  const root = useRef<THREE.Group>(null)
  const mountTime = useRef(performance.now())
  const [phase, setPhase] = useState<'idle' | 'collecting'>('idle')
  const collectStart = useRef(0)
  const startWorld = useRef(new THREE.Vector3())
  const finished = useRef(false)

  const pixels = getDropPixelData(entity.drop)
  const kindScale = worldLootKindScale(entity.drop)
  const baseScale = WORLD_LOOT_BASE_SCALE * kindScale

  useFrame(({ clock }) => {
    const g = root.current
    if (!g || !pixels) return

    const t = clock.elapsedTime
    const [bx, by, bz] = entity.position

    if (phase === 'collecting') {
      const elapsed = performance.now() - collectStart.current
      const p = Math.min(1, elapsed / 250)
      const ease = 1 - Math.pow(1 - p, 2)
      g.position.lerpVectors(startWorld.current, camera.position, ease)
      g.scale.setScalar(baseScale * (1 - ease))
      if (p >= 1 && !finished.current) {
        finished.current = true
        onCollect(entity.id)
      }
      return
    }

    const age = (performance.now() - mountTime.current) / 1000
    const grow = Math.min(1, age / 0.2)
    const bob = Math.sin(t * 2.2) * 0.015
    g.position.set(bx, by + bob, bz)
    g.scale.setScalar(baseScale * grow)
    g.rotation.y = t * 0.9
  })

  const tryCollect = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation()
    if (entity.collected || phase === 'collecting' || !root.current) return
    setPhase('collecting')
    collectStart.current = performance.now()
    startWorld.current.copy(root.current.position)
  }

  if (!pixels) return null

  const rare = isRareGlow(entity.drop)

  return (
    <group ref={root}>
      {rare && (
        <pointLight color={glowColor(entity.drop)} intensity={0.55} distance={4} decay={2} position={[0, 0.35, 0]} />
      )}
      <group position={[0, -0.12, 0]}>
        <VoxelMesh data={pixels.data} colorMap={pixels.colorMap} />
      </group>
      {/* Stor samle-sfære — lettere at ramme fra FPS; centreret om voxel-centrum */}
      <mesh position={[0, 0.08, 0]} onPointerDown={tryCollect} onClick={tryCollect}>
        <sphereGeometry args={[1.35, 14, 14]} />
        <meshBasicMaterial transparent opacity={0.02} depthTest={false} depthWrite={false} />
      </mesh>
    </group>
  )
}
