import { useGLTF } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { PixelItem } from '../../../types'
import VoxelMesh from '../../VoxelMesh'
import {
  WEAPON_SCENE_PICKAXE_GLB,
  WEAPON_SCENE_SWORD_GLB,
} from '../../../data/weaponVisuals'
import type { WeaponFpsDevRuntime } from '../weaponFpsDevRuntime'
import {
  DEFAULT_PICKAXE_TRANSFORM,
  DEFAULT_SWORD_TRANSFORM,
  type HeldFpsTransform,
} from './pickaxeDefaults'

useGLTF.preload(WEAPON_SCENE_PICKAXE_GLB)
useGLTF.preload(WEAPON_SCENE_SWORD_GLB)

type Props = {
  pixelItem: PixelItem
  swingTrigger: number
  disabled: boolean
  visible: boolean
  heldWeaponKind: 'pickaxe' | 'sword'
  sceneGlbUrl?: string
  /** Dev: live overrides fra `?weaponDev=1`-panelet. */
  weaponFpsDev?: WeaponFpsDevRuntime | null
}

const PICKAXE_HELD: HeldFpsTransform = {
  ...DEFAULT_PICKAXE_TRANSFORM,
  scaleMul: 1,
}

type VoxelInnerProps = Omit<Props, 'sceneGlbUrl' | 'weaponFpsDev'> & {
  t: HeldFpsTransform
}

function Pickaxe3DVoxel({ pixelItem, swingTrigger, disabled, visible, heldWeaponKind: _k, t }: VoxelInnerProps) {
  const { camera } = useThree()
  const groupRef = useRef<THREE.Group>(null)
  const swingPhase = useRef<'idle' | 'down' | 'return'>('idle')
  const swingStartSec = useRef(0)
  const lastTrigRef = useRef(swingTrigger)

  const offsetWorld = useRef(new THREE.Vector3())
  const localPick = useRef(new THREE.Vector3())
  const quatLocal = useRef(new THREE.Quaternion())
  const eulerTmp = useRef(new THREE.Euler())
  const viewAxisSpin = useRef(new THREE.Vector3())
  const spinQuat = useRef(new THREE.Quaternion())

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

    const spin = t.inPlaceSpinRad ?? 0
    if (Math.abs(spin) > 1e-8) {
      viewAxisSpin.current.copy(g.position).sub(camera.position)
      if (viewAxisSpin.current.lengthSq() > 1e-10) {
        viewAxisSpin.current.normalize()
        spinQuat.current.setFromAxisAngle(viewAxisSpin.current, spin)
        g.quaternion.premultiply(spinQuat.current)
      }
    }

    g.scale.setScalar(voxelScale * 0.945 * t.scaleMul)
  })

  return (
    <group ref={groupRef} visible={visible} frustumCulled={false} renderOrder={99999}>
      <group position={[pivotXZ[0], pivotXZ[1], 0]} rotation={t.meshOrient}>
        <VoxelMesh
          data={pixelItem.data}
          colorMap={pixelItem.colorMap}
          frustumCulled={false}
          applyFog={false}
          depthTest={false}
          renderOrder={99999}
        />
      </group>
    </group>
  )
}

type GlbInnerProps = Omit<Props, 'pixelItem' | 'weaponFpsDev'> & {
  sceneGlbUrl: string
  t: HeldFpsTransform
  glbMul: number
}

function Pickaxe3DGlb({ sceneGlbUrl, swingTrigger, disabled, visible, heldWeaponKind: _k, t, glbMul }: GlbInnerProps) {
  const { camera } = useThree()
  const { scene } = useGLTF(sceneGlbUrl) as { scene: THREE.Group }
  const groupRef = useRef<THREE.Group>(null)
  const swingPhase = useRef<'idle' | 'down' | 'return'>('idle')
  const swingStartSec = useRef(0)
  const lastTrigRef = useRef(swingTrigger)

  const offsetWorld = useRef(new THREE.Vector3())
  const localPick = useRef(new THREE.Vector3())
  const quatLocal = useRef(new THREE.Quaternion())
  const eulerTmp = useRef(new THREE.Euler())
  const viewAxisSpin = useRef(new THREE.Vector3())
  const spinQuat = useRef(new THREE.Quaternion())

  const model = useMemo(() => {
    const g = scene.clone(true)
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.castShadow = true
        o.receiveShadow = true
      }
    })
    return g
  }, [scene])

  useLayoutEffect(() => {
    model.updateMatrixWorld(true)
    const box = new THREE.Box3().setFromObject(model)
    const center = box.getCenter(new THREE.Vector3())
    model.position.sub(center)
    box.setFromObject(model)
    const size = box.getSize(new THREE.Vector3())
    const m = Math.max(size.x, size.y, size.z, 1e-3)
    model.scale.setScalar(1 / m)
  }, [model])

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

    const spin = t.inPlaceSpinRad ?? 0
    if (Math.abs(spin) > 1e-8) {
      viewAxisSpin.current.copy(g.position).sub(camera.position)
      if (viewAxisSpin.current.lengthSq() > 1e-10) {
        viewAxisSpin.current.normalize()
        spinQuat.current.setFromAxisAngle(viewAxisSpin.current, spin)
        g.quaternion.premultiply(spinQuat.current)
      }
    }

    g.scale.setScalar(glbMul * t.scaleMul)
  })

  return (
    <group ref={groupRef} visible={visible} frustumCulled={false} renderOrder={99999}>
      <group rotation={t.meshOrient}>
        <primitive object={model} frustumCulled={false} />
      </group>
    </group>
  )
}

export default function Pickaxe3D(props: Props) {
  const { sceneGlbUrl, weaponFpsDev, heldWeaponKind, pixelItem, swingTrigger, disabled, visible } = props

  const defaultT = heldWeaponKind === 'sword' ? DEFAULT_SWORD_TRANSFORM : PICKAXE_HELD
  const t = weaponFpsDev?.transform ?? defaultT
  const glbMul =
    weaponFpsDev?.glbScaleBase ?? (heldWeaponKind === 'sword' ? 0.52 : 0.44)

  if (sceneGlbUrl) {
    return (
      <Pickaxe3DGlb
        sceneGlbUrl={sceneGlbUrl}
        swingTrigger={swingTrigger}
        disabled={disabled}
        visible={visible}
        heldWeaponKind={heldWeaponKind}
        t={t}
        glbMul={glbMul}
      />
    )
  }

  return (
    <Pickaxe3DVoxel
      pixelItem={pixelItem}
      swingTrigger={swingTrigger}
      disabled={disabled}
      visible={visible}
      heldWeaponKind={heldWeaponKind}
      t={t}
    />
  )
}
