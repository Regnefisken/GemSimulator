import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CaveConfig } from '../../../../types'
import { getCaveHalfExtents } from '../../../../lib/caveHalfExtents'
import { createSeededRandom } from '../../../../lib/caveSeed'

type Props = {
  caveConfig?: CaveConfig
  seed: number
  hitTrigger?: number
  burstOrigin?: [number, number, number]
  maxParticles?: number
}

export default function DustParticles({
  caveConfig,
  seed,
  hitTrigger = 0,
  burstOrigin = [0, 1.2, 0],
  maxParticles = 100,
}: Props) {
  const count = Math.min(220, Math.max(24, maxParticles))
  const rng = useMemo(() => createSeededRandom(seed ^ 0xd057), [seed])
  const prevTrig = useRef(hitTrigger)

  const driftHalf = useMemo(() => {
    if (!caveConfig) return { hx: 9, hz: 9 }
    const { halfX, halfZ } = getCaveHalfExtents(caveConfig)
    return { hx: Math.max(0.4, halfX - 0.5), hz: Math.max(0.4, halfZ - 0.5) }
  }, [caveConfig])

  const geo = useMemo(() => {
    const arr = new Float32Array(count * 3)
    const r = createSeededRandom(seed ^ 0xd057)
    const { hx, hz } = driftHalf
    for (let i = 0; i < count; i++) {
      arr[i * 3] = (r() * 2 - 1) * hx
      arr[i * 3 + 1] = r() * 5
      arr[i * 3 + 2] = (r() * 2 - 1) * hz
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [seed, count, driftHalf])

  useFrame((_, delta) => {
    const attr = geo.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const drift = 0.35 * delta

    if (hitTrigger !== prevTrig.current) {
      prevTrig.current = hitTrigger
      const [ox, oy, oz] = burstOrigin
      const r = createSeededRandom(seed + hitTrigger * 9973)
      for (let i = 0; i < Math.min(20, count); i++) {
        arr[i * 3] = ox + (r() - 0.5) * 0.5
        arr[i * 3 + 1] = oy + r() * 0.35
        arr[i * 3 + 2] = oz + (r() - 0.5) * 0.5
      }
    }

    const r2 = rng
    for (let i = 0; i < count; i++) {
      arr[i * 3 + 1] += drift
      if (arr[i * 3 + 1] > 5.2) {
        arr[i * 3 + 1] = r2() * 0.15
        arr[i * 3] = (r2() * 2 - 1) * driftHalf.hx
        arr[i * 3 + 2] = (r2() * 2 - 1) * driftHalf.hz
      }
    }

    attr.needsUpdate = true
  })

  return (
    <points geometry={geo} renderOrder={-80}>
      <pointsMaterial color="#c4b5a0" size={0.035} transparent opacity={0.55} depthWrite={false} />
    </points>
  )
}
