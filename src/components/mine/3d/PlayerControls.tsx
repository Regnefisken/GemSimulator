import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'

const MOVE_SPEED = 4.5
const EYE_Y = 1.55

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
 * Førstepersons WASD + PointerLockControls (mus look). Bevægelse kun når pointer er låst.
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
  const wasPointerLocked = useRef(false)

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

  useEffect(() => {
    if (disablePointerLock) return
    const onPl = () => {
      const locked = document.pointerLockElement != null
      if (locked && !wasPointerLocked.current) {
        camera.rotation.order = 'YXZ'
        const p = camera.position
        const dx = spawnLookAtX - p.x
        const dz = spawnLookAtZ - p.z
        if (dx * dx + dz * dz >= 1e-5) {
          camera.lookAt(spawnLookAtX, EYE_Y, spawnLookAtZ)
        } else {
          camera.rotation.set(0, 0, 0, 'YXZ')
        }
      }
      wasPointerLocked.current = locked
    }
    document.addEventListener('pointerlockchange', onPl)
    return () => document.removeEventListener('pointerlockchange', onPl)
  }, [camera, disablePointerLock, spawnLookAtX, spawnLookAtZ])

  useFrame((_, delta) => {
    const bx = boundsHalfX ?? bounds
    const bz = boundsHalfZ ?? bounds
    camera.position.y = EYE_Y

    if (document.pointerLockElement != null) {
      const k = keys.current
      if (k.w || k.s || k.a || k.d) {
        forward.current.set(0, 0, -1).applyQuaternion(camera.quaternion)
        forward.current.y = 0
        if (forward.current.lengthSq() > 1e-6) forward.current.normalize()

        right.current.set(1, 0, 0).applyQuaternion(camera.quaternion)
        right.current.y = 0
        if (right.current.lengthSq() > 1e-6) right.current.normalize()

        moveDir.current.set(0, 0, 0)
        if (k.w) moveDir.current.add(forward.current)
        if (k.s) moveDir.current.sub(forward.current)
        if (k.d) moveDir.current.add(right.current)
        if (k.a) moveDir.current.sub(right.current)

        if (moveDir.current.lengthSq() > 0) {
          moveDir.current.normalize().multiplyScalar(MOVE_SPEED * delta)
          camera.position.add(moveDir.current)
        }
      }
    }

    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -bx, bx)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -bz, bz)
  })

  return disablePointerLock ? null : <PointerLockControls />
}
