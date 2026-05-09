import { useMemo } from 'react'
import type { CaveConfig } from '../../../../types'
import { getCaveHalfExtents } from '../../../../lib/caveHalfExtents'
import { createSeededRandom, pickRange } from '../../../../lib/caveSeed'

type Props = {
  caveConfig: CaveConfig
  seed: number
}

function distSq(a: [number, number], b: [number, number]) {
  const dx = a[0] - b[0]
  const dz = a[1] - b[1]
  return dx * dx + dz * dz
}

export default function Stalactites({ caveConfig, seed }: Props) {
  const items = useMemo(() => {
    const rngInit = createSeededRandom(seed ^ 0x5ec11ab)
    const stalN = pickRange(rngInit, caveConfig.stalactiteRange)
    const migN = pickRange(rngInit, caveConfig.stalagmiteRange)

    const slots2d = caveConfig.oreSlots.map((p) => [p[0], p[2]] as [number, number])
    const minD = 2.0
    const list: {
      key: string
      position: [number, number, number]
      radius: number
      height: number
      yRot: number
      fromCeiling: boolean
    }[] = []
    const rngLocal = createSeededRandom(seed ^ 0x71a1)
    const triesMax = 120
    const { halfX, halfZ } = getCaveHalfExtents(caveConfig)

    const pushOne = (fromCeiling: boolean) => {
      let tries = 0
      while (tries < triesMax) {
        tries++
        const x = (rngLocal() * 2 - 1) * Math.max(0.25, halfX - 1.2)
        const z = (rngLocal() * 2 - 1) * Math.max(0.25, halfZ - 1.2)
        const ok = slots2d.every((s) => distSq([x, z], s) >= minD * minD)
        if (!ok) continue
        const h = 0.45 + rngLocal() * 1.1
        const r = 0.08 + rngLocal() * 0.12
        const yRot = rngLocal() * Math.PI * 2
        list.push({
          key: `s-${list.length}-${seed}`,
          position: fromCeiling ? [x, 5.2 - h / 2, z] : [x, h / 2 + 0.02, z],
          radius: r,
          height: h,
          yRot,
          fromCeiling,
        })
        break
      }
    }

    for (let i = 0; i < stalN; i++) pushOne(true)
    for (let i = 0; i < migN; i++) pushOne(false)

    return list
  }, [
    caveConfig.bounds,
    caveConfig.boundsHalfX,
    caveConfig.boundsHalfZ,
    caveConfig.oreSlots,
    caveConfig.stalactiteRange,
    caveConfig.stalagmiteRange,
    seed,
  ])

  return (
    <group>
      {items.map((it) => (
        <mesh
          key={it.key}
          position={it.position}
          rotation={[it.fromCeiling ? Math.PI : 0, it.yRot, 0]}
        >
          <coneGeometry args={[it.radius, it.height, 6]} />
          <meshStandardMaterial color={caveConfig.wallColor} roughness={0.88} metalness={0.06} />
        </mesh>
      ))}
    </group>
  )
}
