import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PixelItem } from '../../../types'
import VoxelMesh from '../../VoxelMesh'

type Props = {
  pixelItem: PixelItem
  swingTrigger: number
  disabled: boolean
  visible: boolean
}

const BASE_ROT = new THREE.Euler(0.15, -0.2, 0.05)
const BASE_POS = new THREE.Vector3(0.42, -0.48, -0.72)

export default function Pickaxe3D({ pixelItem, swingTrigger, disabled, visible }: Props) {
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
    /** Lidt større end før — lettere at se i førsteperson */
    return Math.min(0.15, 3.4 / m)
  }, [pixelItem.data])

  useEffect(() => {
    if (swingTrigger !== lastTrigRef.current && !disabled && visible) {
      lastTrigRef.current = swingTrigger
      swingPhase.current = 'down'
      swingStartSec.current = performance.now() / 1000
    }
  }, [swingTrigger, disabled, visible])

  /**
   * Placer hakken i world space foran kameraet hver frame.
   * `camera.add(mesh)` brudt R3F/reconciliation — gruppen ender ofte usynlig eller forkert parentet.
   */
  useFrame(({ clock }) => {
    const g = groupRef.current
    if (!g) return

    g.visible = visible
    if (!visible) return

    const t = clock.elapsedTime
    const rx0 = BASE_ROT.x
    let rotX = rx0
    let bobLocalY = 0

    if (disabled) {
      bobLocalY = Math.sin(t * 2.2) * 0.002
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
        bobLocalY = Math.sin(t * 2.2) * 0.002
      }
    }

    eulerTmp.current.set(rotX, BASE_ROT.y, BASE_ROT.z)
    quatLocal.current.setFromEuler(eulerTmp.current)

    localPick.current.set(BASE_POS.x, BASE_POS.y + bobLocalY, BASE_POS.z)
    localPick.current.applyQuaternion(camera.quaternion)
    offsetWorld.current.copy(camera.position).add(localPick.current)

    g.position.copy(offsetWorld.current)
    g.quaternion.copy(camera.quaternion).multiply(quatLocal.current)
    g.scale.setScalar(voxelScale)
  })

  return (
    <group ref={groupRef} visible={visible} frustumCulled={false} renderOrder={1000}>
      {/*
        Hakken ligger tæt på kamera og mellem spiller og malm — globale punktlys rammer den svagt.
        Lokalt lys holder paletten læsbar uden at dominere grotten.
      */}
      <pointLight intensity={18} distance={3.2} decay={2} position={[0.28, -0.12, 0.22]} color="#fff8f0" />
      <VoxelMesh data={pixelItem.data} colorMap={pixelItem.colorMap} frustumCulled={false} />
    </group>
  )
}
