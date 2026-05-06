import { useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import type { CaveConfig } from '../../../../types'
import { createCaveNoise } from '../../../../lib/caveSeed'

type Props = {
  caveConfig: CaveConfig
  seed: number
}

export default function CaveWalls({ caveConfig, seed }: Props) {
  const noise = useMemo(() => createCaveNoise(seed ^ 0x51eded01), [seed])

  const floorGeo = useMemo(
    () => makeHorizontalPlane(noise, seed ^ 0xabc01, 'floor'),
    [noise, seed],
  )
  const ceilGeo = useMemo(
    () => makeHorizontalPlane(noise, seed ^ 0x11111ab1, 'ceil'),
    [noise, seed],
  )
  const northGeo = useMemo(() => makeWallPlane(noise, seed ^ 0xabad1dea), [noise, seed])
  const westGeo = useMemo(() => makeWallPlane(noise, seed ^ 0xcafebabe), [noise, seed])
  const eastGeo = useMemo(() => makeWallPlane(noise, seed ^ 0xdecafbad), [noise, seed])

  useLayoutEffect(() => {
    return () => {
      floorGeo.dispose()
      ceilGeo.dispose()
      northGeo.dispose()
      westGeo.dispose()
      eastGeo.dispose()
    }
  }, [floorGeo, ceilGeo, northGeo, westGeo, eastGeo])

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
      {/* PlaneGeometry ligger i XY; ingen rotation — ellers bliver væggen et vandret bånd ved y≈2.6 */}
      <mesh position={[0, 2.6, -11]} geometry={northGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[-11, 2.6, 0]} rotation={[Math.PI / 2, Math.PI / 2, 0]} geometry={westGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
      <mesh position={[11, 2.6, 0]} rotation={[Math.PI / 2, -Math.PI / 2, 0]} geometry={eastGeo}>
        <meshStandardMaterial {...wallMat} />
      </mesh>
    </>
  )
}

function makeHorizontalPlane(noise: (x: number, y: number) => number, salt: number, kind: 'floor' | 'ceil') {
  const geom = new THREE.PlaneGeometry(22, 22, 8, 8)
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

function makeWallPlane(noise: (x: number, y: number) => number, salt: number) {
  const geom = new THREE.PlaneGeometry(22, 5.4, 8, 4)
  const pos = geom.attributes.position as THREE.BufferAttribute
  const arr = pos.array as Float32Array
  for (let i = 0; i < arr.length; i += 3) {
    const u = arr[i]
    const v = arr[i + 1]
    const n = noise(u * 0.28 + salt * 0.0013, v * 0.31 + salt * 0.0018)
    arr[i + 2] = n * 0.35
  }
  pos.needsUpdate = true
  geom.computeVertexNormals()
  return geom
}
