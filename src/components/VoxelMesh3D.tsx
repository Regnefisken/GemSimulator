import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Voxel3DGrid } from '../types'
import { resolveColor } from '../gem/colorResolver'
import { MAX_VOXEL_INSTANCES } from './VoxelMesh'

const dummy = new THREE.Object3D()
const _color = new THREE.Color()

/**
 * Instanceret 3D-voxel-grid (`Voxel3DGrid`) — samme som i `VoxelScene` mode 3d / ædelsten-previews.
 */
export default function VoxelMesh3D({ voxel3d }: { voxel3d: Voxel3DGrid }) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => new THREE.BoxGeometry(1, 1, 1), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        roughness: 0.4,
        metalness: 0.15,
        flatShading: true,
      }),
    [],
  )

  useEffect(() => {
    const mesh = meshRef.current
    if (!mesh || !voxel3d.layers.length) return
    const depth = voxel3d.depth
    const h = voxel3d.layers[0].length
    const w = voxel3d.layers[0][0].length
    let idx = 0
    outer: for (let z = 0; z < depth; z++) {
      const layer = voxel3d.layers[z]
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const ch = layer[y]![x]!
          if (ch === '.') continue
          if (idx >= MAX_VOXEL_INSTANCES) break outer
          dummy.position.set(x - (w - 1) / 2, -y + (h - 1) / 2, z - (depth - 1) / 2)
          dummy.rotation.set(0, 0, 0)
          dummy.scale.set(1, 1, 1)
          dummy.updateMatrix()
          mesh.setMatrixAt(idx, dummy.matrix)
          _color.set(resolveColor(ch, voxel3d.colorMap) ?? '#000000')
          mesh.setColorAt(idx, _color)
          idx++
        }
      }
    }
    mesh.count = idx
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }, [voxel3d])

  return <instancedMesh ref={meshRef} args={[geo, mat, MAX_VOXEL_INSTANCES]} />
}
