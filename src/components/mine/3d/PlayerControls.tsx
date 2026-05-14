import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { mineMobileSurface } from '../mineMobileSurface'

const MOVE_SPEED = 4.5
const EYE_Y = 1.55
const LOOK_SENS = 0.0022
const PITCH_MAX = 1.35

type Props = {
  bounds?: number
  boundsHalfX?: number
  boundsHalfZ?: number
  /** Horisontalt lookAt ved spawn (verdens-X/Z); default mod grottens midte. */
  spawnLookAtX?: number
  spawnLookAtZ?: number
  /** Ingen PointerLockControls — mus kan ikke låses til FPS-canvas (fx under kiste-UI). */
  disablePointerLock?: boolean
}

/**
 * Førstepersons WASD + PointerLockControls (mus look). På grove pejlere: virtuel joystick + kig-flade (`MineMobileNavOverlay`).
 */
export default function PlayerControls({
  bounds = 9,
  boundsHalfX,
  boundsHalfZ,
  spawnLookAtX = 0,
  spawnLookAtZ = 0,
  disablePointerLock = false,
}: Props) {
  const { camera } = useThree()
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const moveDir = useRef(new THREE.Vector3())

  const [coarsePointer, setCoarsePointer] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches,
  )

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const fn = () => setCoarsePointer(mq.matches)
    mq.addEventListener('change', fn)
    return () => mq.removeEventListener('change', fn)
  }, [])

  /** Horisontalt udsyn mod spawn-mål (typisk ind i rummet fra væg) — undgår utilsigtet pitch. */
  useLayoutEffect(() => {
    camera.rotation.order = 'YXZ'
    const p = camera.position
    const dx = spawnLookAtX - p.x
    const dz = spawnLookAtZ - p.z
    if (dx * dx + dz * dz < 1e-5) {
      camera.rotation.set(0, 0, 0, 'YXZ')
      return
    }
    camera.lookAt(spawnLookAtX, EYE_Y, spawnLookAtZ)
  }, [camera, spawnLookAtX, spawnLookAtZ])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const k = e.key.toLowerCase()
      if (k === 'w') keys.current.w = true
      if (k === 'a') keys.current.a = true
      if (k === 's') keys.current.s = true
      if (k === 'd') keys.current.d = true
    }
    const onKeyUp = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      if (k === 'w') keys.current.w = false
      if (k === 'a') keys.current.a = false
      if (k === 's') keys.current.s = false
      if (k === 'd') keys.current.d = false
    }
    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  useFrame((_, delta) => {
    const bx = boundsHalfX ?? bounds
    const bz = boundsHalfZ ?? bounds
    camera.position.y = EYE_Y

    const ptrLocked = document.pointerLockElement != null
    const mobileNav = coarsePointer && !disablePointerLock

    if (mobileNav) {
      const ld = mineMobileSurface.lookDelta
      if (ld.x !== 0 || ld.y !== 0) {
        camera.rotation.y -= ld.x * LOOK_SENS
        camera.rotation.x -= ld.y * LOOK_SENS
        camera.rotation.x = THREE.MathUtils.clamp(camera.rotation.x, -PITCH_MAX, PITCH_MAX)
        ld.x = 0
        ld.y = 0
      }
    }

    const canMove = ptrLocked || mobileNav
    if (canMove) {
      const k = keys.current
      const m = mineMobileSurface.moveStick
      let fx = 0
      let fz = 0
      if (k.w) fz += 1
      if (k.s) fz -= 1
      if (k.d) fx += 1
      if (k.a) fx -= 1
      const sm = Math.hypot(m.x, m.z)
      if (sm > 0.02) {
        fx += m.x
        fz += m.z
      }
      const dirLen = Math.hypot(fx, fz)
      if (dirLen > 1e-4) {
        fx /= dirLen
        fz /= dirLen

        forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
        forward.current.y = 0
        if (forward.current.lengthSq() > 1e-6) forward.current.normalize()

        right.current.set(1, 0, 0).applyQuaternion(camera.quaternion)
        right.current.y = 0
        if (right.current.lengthSq() > 1e-6) right.current.normalize()

        moveDir.current.set(0, 0, 0)
        moveDir.current.addScaledVector(forward.current, fz)
        moveDir.current.addScaledVector(right.current, fx)

        if (moveDir.current.lengthSq() > 0) {
          moveDir.current.normalize().multiplyScalar(MOVE_SPEED * delta)
          camera.position.add(moveDir.current)
        }
      }
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -bx, bx)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -bz, bz)
  })

  const showPointerLock = !disablePointerLock && !coarsePointer
  return showPointerLock ? <PointerLockControls /> : null
}
