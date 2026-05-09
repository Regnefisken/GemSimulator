import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { CosmeticRock } from '../../../types'

type Props = {
  rocks: CosmeticRock[]
}

/** Dekorative instanser — ingen raycast mod mus ( gameplay-targets forbliver foretrukne ). */
export default function CosmeticRocksInstanced({ rocks }: Props) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const geom = useMemo(() => new THREE.BoxGeometry(0.38, 0.44, 0.32), [])
  const mat = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: '#6a625a',
        roughness: 0.92,
        metalness: 0.04,
        flatShading: true,
      }),
    [],
  )

  useEffect(() => {
    return () => {
      geom.dispose()
      mat.dispose()
    }
  }, [geom, mat])

  useLayoutEffect(() => {
    const mesh = meshRef.current
    if (!mesh || rocks.length === 0) return
    const dummy = new THREE.Object3D()
    rocks.forEach((r, i) => {
      dummy.position.set(r.position[0], r.position[1], r.position[2])
      dummy.rotation.y = r.rotationY
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
    })
    mesh.instanceMatrix.needsUpdate = true
  }, [rocks])

  if (rocks.length === 0) return null

  return (
    <instancedMesh
      key={rocks.length}
      ref={meshRef}
      args={[geom, mat, rocks.length]}
      frustumCulled
      raycast={() => null}
      castShadow
      receiveShadow
    />
  )
}
