import { PointerLockControls } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

const MOVE_SPEED = 4.5
const EYE_Y = 1.55

type Props = {
  bounds?: number
}

/**
 * Førstepersons WASD + PointerLockControls (mus look). Bevægelse kun når pointer er låst.
 */
export default function PlayerControls({ bounds = 9 }: Props) {
  const { camera } = useThree()
  const keys = useRef({ w: false, a: false, s: false, d: false })
  const forward = useRef(new THREE.Vector3())
  const right = useRef(new THREE.Vector3())
  const moveDir = useRef(new THREE.Vector3())

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
    if (document.pointerLockElement == null) return
    const k = keys.current
    if (!k.w && !k.s && !k.a && !k.d) return

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

    camera.position.y = EYE_Y
    camera.position.x = THREE.MathUtils.clamp(camera.position.x, -bounds, bounds)
    camera.position.z = THREE.MathUtils.clamp(camera.position.z, -bounds, bounds)
  })

  return <PointerLockControls />
}
