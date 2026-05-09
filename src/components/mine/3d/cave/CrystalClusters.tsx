import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CaveConfig } from '../../../../types'
import { METALS } from '../../../../data/metals'
import { getCaveHalfExtents, getCaveWallEdge } from '../../../../lib/caveHalfExtents'
import { createSeededRandom, pickRange } from '../../../../lib/caveSeed'

type Props = {
  caveConfig: CaveConfig
  seed: number
}

function CrystalShard({
  baseColor,
  ox,
  oy,
  oz,
  sx,
  sy,
  sz,
  hueJitter,
}: {
  baseColor: string
  ox: number
  oy: number
  oz: number
  sx: number
  sy: number
  sz: number
  hueJitter: number
}) {
  const matRef = useRef<THREE.MeshStandardMaterial>(null)

  useFrame(({ clock }) => {
    const m = matRef.current
    if (!m) return
    const t = clock.elapsedTime
    m.emissiveIntensity = 0.3 + 0.15 * Math.sin(t * 0.8)
  })

  const emissive = useMemo(() => {
    const c = new THREE.Color(baseColor)
    c.offsetHSL(hueJitter, 0, 0)
    return c
  }, [baseColor, hueJitter])

  return (
    <mesh position={[ox, oy, oz]} scale={[sx, sy, sz]}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        ref={matRef}
        color={baseColor}
        roughness={0.35}
        metalness={0.25}
        emissive={emissive}
        emissiveIntensity={0.3}
      />
    </mesh>
  )
}

export default function CrystalClusters({ caveConfig, seed }: Props) {
  const metal = caveConfig.crystalMetal

  const clusters = useMemo(() => {
    if (!metal) return null
    const baseColor = METALS[metal]?.pixelColor ?? '#94a3b8'
    const rng = createSeededRandom(seed ^ 0xb100d)
    const count = pickRange(rng, caveConfig.crystalClusterRange)

    const { halfX, halfZ } = getCaveHalfExtents(caveConfig)
    const { wallEdgeX, wallEdgeZ } = getCaveWallEdge(halfX, halfZ)

    const wallChoices: Array<{ pos: [number, number, number]; face: 'north' | 'west' | 'east' }> = [
      { pos: [0, 2.2, -wallEdgeZ], face: 'north' },
      { pos: [-wallEdgeX, 2.2, 0], face: 'west' },
      { pos: [wallEdgeX, 2.2, 0], face: 'east' },
    ]

    const out: {
      key: string
      groupPos: [number, number, number]
      crystals: { ox: number; oy: number; oz: number; sx: number; sy: number; sz: number; hue: number }[]
    }[] = []

    for (let c = 0; c < count; c++) {
      const wall = wallChoices[Math.floor(rng() * wallChoices.length)]!
      const jitterY = (rng() - 0.5) * 2.2
      const jitterNorth = (rng() - 0.5) * Math.min(8, halfX * 1.55)
      const jitterSide = (rng() - 0.5) * Math.min(8, halfZ * 1.55)
      const groupPos: [number, number, number] = [...wall.pos] as [number, number, number]
      groupPos[1] += jitterY
      if (wall.face === 'north') groupPos[0] += jitterNorth
      else groupPos[2] += jitterSide

      const nCrystals = 3 + Math.floor(rng() * 3)
      const crystals: { ox: number; oy: number; oz: number; sx: number; sy: number; sz: number; hue: number }[] = []
      for (let i = 0; i < nCrystals; i++) {
        crystals.push({
          ox: (rng() - 0.5) * 0.35,
          oy: (rng() - 0.5) * 0.35,
          oz: 0.12,
          sx: 0.06 + rng() * 0.06,
          sy: 0.12 + rng() * 0.14,
          sz: 0.05 + rng() * 0.05,
          hue: rng() * 0.06 - 0.03,
        })
      }
      out.push({ key: `cl-${c}-${seed}`, groupPos, crystals })
    }

    return { list: out, baseColor }
  }, [
    caveConfig.bounds,
    caveConfig.boundsHalfX,
    caveConfig.boundsHalfZ,
    caveConfig.crystalClusterRange,
    metal,
    seed,
  ])

  if (!clusters || clusters.list.length === 0) return null

  return (
    <group>
      {clusters.list.map((cl) => (
        <group key={cl.key} position={cl.groupPos}>
          {cl.crystals.map((cr, i) => (
            <CrystalShard
              key={i}
              baseColor={clusters.baseColor}
              ox={cr.ox}
              oy={cr.oy}
              oz={cr.oz}
              sx={cr.sx}
              sy={cr.sy}
              sz={cr.sz}
              hueJitter={cr.hue}
            />
          ))}
        </group>
      ))}
    </group>
  )
}
