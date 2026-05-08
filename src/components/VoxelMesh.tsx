import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { ColorMap } from '../types'
import { resolveColor } from '../gem/colorResolver'

const dummy = new THREE.Object3D()
const _color = new THREE.Color()

export const MAX_VOXEL_INSTANCES = 1024

export type VoxelMeshProps = {
  data: string[]
  colorMap: ColorMap
  /** Defaults til preview/grænse for instanser */
  maxInstances?: number
  /**
   * FPS-hakke / instanser med store offsets: Three.js bruger geometry-BB til frustum-test,
   * så instanser kan klippes forkert. Slå fra for kamera-monteret hakke.
   */
  frustumCulled?: boolean
  /** Ignorerer lys/tåge — stabilt synlig FPS-hakke i mørke grotter */
  unlit?: boolean
  /** false = tegn ovenpå dybde (FPS-våben mod malm) */
  depthTest?: boolean
  /** false = skriv ikke til dybdebuffer (undgår at blokere senere passes) */
  depthWrite?: boolean
  /** Høj værdi = tegnes sent i opaque-køen (løser forkert sortering mod InstancedMesh-BB) */
  renderOrder?: number
  /**
   * For belyste meshes (`unlit` false): grottens tåge — slå fra for FPS-våben på overlay
   * (ingen tåge i det lag).
   */
  applyFog?: boolean
}

/**
 * Fælles instanceret voxel-grid til brug i VoxelScene, FPS-hakke og verdens-loot.
 */
export default function VoxelMesh({
  data,
  colorMap,
  maxInstances = MAX_VOXEL_INSTANCES,
  frustumCulled = true,
  unlit = false,
  depthTest = true,
  depthWrite,
  renderOrder = 0,
  applyFog = true,
}: VoxelMeshProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  /** default: samme som depthTest (FPS: depthTest false → depthWrite false) */
  const effectiveDepthWrite = depthWrite ?? depthTest
  const mat = useMemo(() => {
    if (unlit) {
      return new THREE.MeshBasicMaterial({
        vertexColors: true,
        fog: false,
        /** Ellers bliver vertex colors sorte under ACES tone mapping */
        toneMapped: false,
        depthTest,
        depthWrite: effectiveDepthWrite,
      })
    }
    return new THREE.MeshStandardMaterial({
      vertexColors: true,
      roughness: 0.4,
      metalness: 0.15,
      flatShading: true,
      fog: applyFog,
      depthTest,
      depthWrite: effectiveDepthWrite,
    })
  }, [unlit, depthTest, depthWrite, effectiveDepthWrite, applyFog])

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !data.length) return
    const h = data.length
    const w = data[0].length
    let idx = 0
    outer: for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const ch = data[y][x]
        if (ch === '.') continue
        if (idx >= maxInstances) break outer
        dummy.position.set(x - (w - 1) / 2, -y + (h - 1) / 2, 0)
        dummy.rotation.set(0, 0, 0)
        dummy.scale.set(1, 1, 1)
        dummy.updateMatrix()
        mesh.setMatrixAt(idx, dummy.matrix)
        _color.set(resolveColor(ch, colorMap) ?? '#000000')
        mesh.setColorAt(idx, _color)
        idx++
      }
    }
    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [data, colorMap, maxInstances])

  return (
    <instancedMesh
      ref={meshRef}
      args={[geo, mat, maxInstances]}
      frustumCulled={frustumCulled}
      renderOrder={renderOrder}
    />
  )
}
