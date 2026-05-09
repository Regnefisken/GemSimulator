import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { CaveConfig } from '../../../../types'
import { getCaveHalfExtents, getCaveWallEdge, CAVE_WALL_DISPLACEMENT_MAX } from '../../../../lib/caveHalfExtents'
import { createCaveNoise } from '../../../../lib/caveSeed'

type Props = {
  caveConfig: CaveConfig
  seed: number
}

/** Højere end rum 5.2 + ca. 2× udjævning (~0.35) så der ikke er lys-sprækker mod loft/gulv. */
const WALL_PLANE_HEIGHT = 6.25
const WALL_Y_CENTER = 2.6

export default function CaveWalls({ caveConfig, seed }: Props) {
  const { halfX, halfZ } = getCaveHalfExtents(caveConfig)
  const { wallEdgeX, wallEdgeZ } = getCaveWallEdge(halfX, halfZ)

  const noise = useMemo(() => createCaveNoise(seed ^ 0x51eded01), [seed])

  const floorGeo = useMemo(
    () => makeHorizontalPlane(noise, seed ^ 0xabc01, 'floor', halfX * 2, halfZ * 2),
    [noise, seed, halfX, halfZ],
  )
  const ceilGeo = useMemo(
    () => makeHorizontalPlane(noise, seed ^ 0x11111ab1, 'ceil', halfX * 2, halfZ * 2),
    [noise, seed, halfX, halfZ],
  )
  const northGeo = useMemo(
    () => makeWallPlane(noise, seed ^ 0xabad1dea, WALL_PLANE_HEIGHT, halfX * 2),
    [noise, seed, halfX],
  )
  const southGeo = useMemo(
    () => makeWallPlane(noise, seed ^ 0x50c10e5, WALL_PLANE_HEIGHT, halfX * 2),
    [noise, seed, halfX],
  )
  const westGeo = useMemo(
    () => makeWallPlane(noise, seed ^ 0xcafebabe, WALL_PLANE_HEIGHT, halfZ * 2),
    [noise, seed, halfZ],
  )
  const eastGeo = useMemo(
    () => makeWallPlane(noise, seed ^ 0xdecafbad, WALL_PLANE_HEIGHT, halfZ * 2),
    [noise, seed, halfZ],
  )

  useLayoutEffect(() => {
    return () => {
      floorGeo.dispose()
      ceilGeo.dispose()
      northGeo.dispose()
      southGeo.dispose()
      westGeo.dispose()
      eastGeo.dispose()
    }
  }, [floorGeo, ceilGeo, northGeo, southGeo, westGeo, eastGeo])

  const wallMat = {
    roughness: 0.9,
    metalness: 0.05,
    color: caveConfig.wallColor,
  } as const

  return (
    <>
      {/* Geometri er allerede roteret til vandret XZ i makeHorizontalPlane — ingen ekstra mesh-rotation */}
      <mesh position={[0, 0, 0]} geometry={floorGeo} receiveShadow>
        <meshStandardMaterial
          color={caveConfig.floorColor}
          roughness={0.94}
          metalness={0.02}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, 5.2, 0]} geometry={ceilGeo}>
        <meshStandardMaterial
          color={caveConfig.ceilingColor}
          roughness={1}
          metalness={0}
          side={THREE.DoubleSide}
        />
      </mesh>
      {/* PlaneGeometry i XY, normal +Z — nord vender ind i rummet; syd drejes 180° om Y. */}
      <mesh position={[0, WALL_Y_CENTER, -wallEdgeZ]} geometry={northGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[0, WALL_Y_CENTER, wallEdgeZ]} rotation={[0, Math.PI, 0]} geometry={southGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
      {/* Kun rotation om Y — [π/2, π/2, 0] bytter span og 6.25 så væggen ikke blev forkert orienteret. */}
      <mesh position={[-wallEdgeX, WALL_Y_CENTER, 0]} rotation={[0, Math.PI / 2, 0]} geometry={westGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[wallEdgeX, WALL_Y_CENTER, 0]} rotation={[0, -Math.PI / 2, 0]} geometry={eastGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
    </>
  )
}

function makeHorizontalPlane(
  noise: (x: number, y: number) => number,
  salt: number,
  kind: 'floor' | 'ceil',
  width: number,
  depth: number,
) {
  const geom = new THREE.PlaneGeometry(width, depth, 8, 8)
  /** Standard PlaneGeometry ligger i XY; rotér til vandret plan (XZ), så Y er lodret. */
  geom.rotateX(-Math.PI / 2)
  const pos = geom.attributes.position as THREE.BufferAttribute
  const arr = pos.array as Float32Array
  const off = kind === 'floor' ? 0.02 : -0.02
  const bump = kind === 'floor' ? 1 : -1
  for (let i = 0; i < arr.length; i += 3) {
    const x = arr[i]
    const z = arr[i + 2]
    const n = noise(x * 0.35 + salt * 0.001, z * 0.35 + salt * 0.002)
    arr[i + 1] += bump * (n * 0.35 + off)
  }
  pos.needsUpdate = true
  geom.computeVertexNormals()
  return geom
}

function makeWallPlane(
  noise: (x: number, y: number) => number,
  salt: number,
  planeHeight: number,
  spanHorizontal: number,
) {
  const geom = new THREE.PlaneGeometry(spanHorizontal, planeHeight, 8, 4)
  const pos = geom.attributes.position as THREE.BufferAttribute
  const arr = pos.array as Float32Array
  for (let i = 0; i < arr.length; i += 3) {
    const u = arr[i]
    const v = arr[i + 1]
    const n = noise(u * 0.28 + salt * 0.0013, v * 0.31 + salt * 0.0018)
    arr[i + 2] = n * CAVE_WALL_DISPLACEMENT_MAX
  }
  pos.needsUpdate = true
  geom.computeVertexNormals()
  return geom
}
