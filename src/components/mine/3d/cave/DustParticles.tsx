import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { createSeededRandom } from '../../../../lib/caveSeed'

type Props = {
  seed: number
  hitTrigger?: number
  burstOrigin?: [number, number, number]
}

const N = 100

export default function DustParticles({
  seed,
  hitTrigger = 0,
  burstOrigin = [0, 1.2, 0],
}: Props) {
  const rng = useMemo(() => createSeededRandom(seed ^ 0xd057), [seed])
  const prevTrig = useRef(hitTrigger)

  const geo = useMemo(() => {
    const arr = new Float32Array(N * 3)
    const r = createSeededRandom(seed ^ 0xd057)
    for (let i = 0; i < N; i++) {
      arr[i * 3] = (r() * 2 - 1) * 9
      arr[i * 3 + 1] = r() * 5
      arr[i * 3 + 2] = (r() * 2 - 1) * 9
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(arr, 3))
    return g
  }, [seed])

  useFrame((_, delta) => {
    const attr = geo.attributes.position as THREE.BufferAttribute
    const arr = attr.array as Float32Array
    const drift = 0.35 * delta

    if (hitTrigger !== prevTrig.current) {
      prevTrig.current = hitTrigger
      const [ox, oy, oz] = burstOrigin
      const r = createSeededRandom(seed + hitTrigger * 9973)
      for (let i = 0; i < Math.min(20, N); i++) {
        arr[i * 3] = ox + (r() - 0.5) * 0.5
        arr[i * 3 + 1] = oy + r() * 0.35
        arr[i * 3 + 2] = oz + (r() - 0.5) * 0.5
      }
    }

    const r2 = rng
    for (let i = 0; i < N; i++) {
      arr[i * 3 + 1] += drift
      if (arr[i * 3 + 1] > 5.2) {
        arr[i * 3 + 1] = r2() * 0.15
        arr[i * 3] = (r2() * 2 - 1) * 9
        arr[i * 3 + 2] = (r2() * 2 - 1) * 9
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
