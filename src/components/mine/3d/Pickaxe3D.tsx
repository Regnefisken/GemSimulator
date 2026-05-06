import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PixelItem } from '../../../types'
import VoxelMesh from '../../VoxelMesh'
import { DEFAULT_PICKAXE_TRANSFORM } from './pickaxeDefaults'

type Props = {
  pixelItem: PixelItem
  swingTrigger: number
  disabled: boolean
  visible: boolean
}

export default function Pickaxe3D({ pixelItem, swingTrigger, disabled, visible }: Props) {
  const t = DEFAULT_PICKAXE_TRANSFORM
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const swingPhase = useRef<'idle' | 'down' | 'return'>('idle')
  const swingStartSec = useRef(0)
  const lastTrigRef = useRef(swingTrigger)

  const offsetWorld = useRef(new THREE.Vector3())
  const localPick = useRef(new THREE.Vector3())
  const quatLocal = useRef(new THREE.Quaternion())
  const eulerTmp = useRef(new THREE.Euler())

  const voxelScale = useMemo(() => {
    const w = pixelItem.data[0]?.length ?? 12
    const h = pixelItem.data.length ?? 12
    const m = Math.max(w, h)
    return Math.min(0.15, 3.4 / m)
  }, [pixelItem.data])

  const pivotXZ = useMemo(() => {
    const w = pixelItem.data[0]?.length ?? 12
    const h = pixelItem.data.length
    const pivotY = h <= 1 ? 0 : (h - 1) / 2
    const pivotX = (w - 1) / 2 - t.gripColumn
    return [pivotX, pivotY] as const
  }, [pixelItem.data, t.gripColumn])

  useEffect(() => {
    if (swingTrigger !== lastTrigRef.current && !disabled && visible) {
      lastTrigRef.current = swingTrigger
      swingPhase.current = 'down'
      swingStartSec.current = performance.now() / 1000
    }
  }, [swingTrigger, disabled, visible])

  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return

    g.visible = visible
    if (!visible) return

    const rx0 = t.baseRot[0]
    let rotX = rx0
    let bobLocalY = 0

    const tClock = clock.elapsedTime
    if (disabled) {
      bobLocalY = Math.sin(tClock * 2.2) * 0.002
    } else {
      const now = performance.now() / 1000

      if (swingPhase.current === 'down') {
        const dt = now - swingStartSec.current
        const p = Math.min(1, dt / 0.1)
        rotX = THREE.MathUtils.lerp(rx0, 1.35, p)
        if (p >= 1) swingPhase.current = 'return'
      } else if (swingPhase.current === 'return') {
        const t0 = swingStartSec.current + 0.1
        const dt = now - t0
        const p = Math.min(1, dt / 0.18)
        const ease = 1 - Math.pow(1 - p, 2)
        rotX = THREE.MathUtils.lerp(1.35, rx0, ease)
        if (p >= 1) swingPhase.current = 'idle'
      } else {
        bobLocalY = Math.sin(tClock * 2.2) * 0.002
      }
    }

    eulerTmp.current.set(rotX, t.baseRot[1], t.baseRot[2])
    quatLocal.current.setFromEuler(eulerTmp.current)

    localPick.current.set(t.basePos[0], t.basePos[1] + bobLocalY, t.basePos[2])
    localPick.current.applyQuaternion(camera.quaternion)
    offsetWorld.current.copy(camera.position).add(localPick.current)

    g.position.copy(offsetWorld.current)
    g.quaternion.copy(camera.quaternion).multiply(quatLocal.current)
    g.scale.setScalar(voxelScale * 0.945)
  })

  return (
    <group ref={groupRef} visible={visible} frustumCulled={false} renderOrder={1000}>
      <pointLight intensity={22} distance={4} decay={2} position={[0.15, 0.06, 0.24]} color="#fff8f0" />
      <group position={[pivotXZ[0], pivotXZ[1], 0]} rotation={t.meshOrient}>
        <VoxelMesh data={pixelItem.data} colorMap={pixelItem.colorMap} frustumCulled={false} unlit />
      </group>
    </group>
  )
}
