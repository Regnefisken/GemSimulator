import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import type { MobType } from '../../../../types'
import { SEAM_SKULKER_SCALE_MUL } from './seamSkulkerScale'

/** HP-badge: crystal model er lidt højere end procedural skulker efter skalering. */
export function crystalBeastHpLabelLocalY(bulk: number): number {
  return bulk * SEAM_SKULKER_SCALE_MUL * 5.55
}

const MOB_MODEL_SCALE = SEAM_SKULKER_SCALE_MUL
const CHASE_SPEED = 2.85
const RETREAT_SPEED = 2.65
const COMBAT_OUTER = 1.86
const TOO_CLOSE = 1.24
const ATTACK_COOLDOWN = 2.25
const WINDUP_DUR = 0.55
const STRIKE_DUR = 0.2
const RECOVERY_DUR = 1.15
const STRIKE_NEAR = 1.38
const STRIKE_FAR = 2.02
const STRIKE_DAMAGE_AT = 0.42

type AttackPhase = 'IDLE' | 'WINDUP' | 'STRIKE' | 'RECOVERY'

type Props = {
  bulk: number
  visualSeed: number
  slotWorldX: number
  slotWorldZ: number
  caveHalfX: number
  caveHalfZ: number
  mobType?: MobType
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onStrikeHit?: () => void
  children?: ReactNode
}

const GLB_URL = '/assets/mobs/crystal_beast.glb'

export default function CrystalBeastSkulkerMob({
  bulk,
  visualSeed,
  slotWorldX,
  slotWorldZ,
  caveHalfX,
  caveHalfZ,
  onClick,
  onPointerDown,
  onStrikeHit,
  children,
}: Props) {
  const { camera } = useThree()
  const { scene, animations } = useGLTF(GLB_URL)

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
    const size = new THREE.Vector3()
    box.getSize(size)
    const h = Math.max(size.y, 1e-3)
    const targetH = 0.82 * bulk
    const s = targetH / h
    model.scale.setScalar(s)
    model.position.set(0, -box.min.y * s, 0)
    model.updateMatrixWorld(true)
  }, [model, bulk])

  const mixer = useMemo(() => new THREE.AnimationMixer(model), [model])

  const { walkAction, attackAction } = useMemo(() => {
    const walkClip = animations.find((c) => c.name === 'walk')
    const attackClip = animations.find((c) => c.name === 'attack')
    return {
      walkAction: walkClip ? mixer.clipAction(walkClip) : null,
      attackAction: attackClip ? mixer.clipAction(attackClip) : null,
    }
  }, [mixer, animations])

  useEffect(() => {
    walkAction?.setLoop(THREE.LoopRepeat, Infinity)
    walkAction?.play()
    attackAction?.setLoop(THREE.LoopOnce, 1)
    if (attackAction) attackAction.clampWhenFinished = true
    attackAction?.setEffectiveWeight(0)
    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [mixer, model, walkAction, attackAction])

  const chaseRef = useRef<THREE.Group>(null)
  const groupRotRef = useRef<THREE.Group>(null)
  const offsetX = useRef(0)
  const offsetZ = useRef(0)

  const attackPhase = useRef<AttackPhase>('IDLE')
  const attackTimer = useRef(0)
  const cooldown = useRef((visualSeed % 97) * 0.01)

  const strikeDamageSent = useRef(false)

  const combatAnimOn = useRef(false)

  const hitRadius = Math.max(0.55, 1.05 * bulk * MOB_MODEL_SCALE)

  useFrame((_, delta) => {
    const px = camera.position.x
    const pz = camera.position.z

    let isWalking = false

    cooldown.current = Math.max(0, cooldown.current - delta)

    if (attackPhase.current === 'IDLE') {
      const mobWx = slotWorldX + offsetX.current
      const mobWz = slotWorldZ + offsetZ.current
      const ddx = px - mobWx
      const ddz = pz - mobWz
      const dDist = Math.hypot(ddx, ddz)
      const nx = dDist > 1e-4 ? ddx / dDist : 0
      const nz = dDist > 1e-4 ? ddz / dDist : 0

      if (dDist < TOO_CLOSE && dDist > 1e-5) {
        const step = Math.min(RETREAT_SPEED * delta, TOO_CLOSE - dDist + 0.12)
        let nwx = mobWx - nx * step
        let nwz = mobWz - nz * step
        nwx = THREE.MathUtils.clamp(nwx, -caveHalfX, caveHalfX)
        nwz = THREE.MathUtils.clamp(nwz, -caveHalfZ, caveHalfZ)
        offsetX.current = nwx - slotWorldX
        offsetZ.current = nwz - slotWorldZ
        isWalking = step > 0.002
      } else if (dDist > COMBAT_OUTER) {
        const step = Math.min(CHASE_SPEED * delta, dDist - COMBAT_OUTER)
        let nwx = mobWx + nx * step
        let nwz = mobWz + nz * step
        nwx = THREE.MathUtils.clamp(nwx, -caveHalfX, caveHalfX)
        nwz = THREE.MathUtils.clamp(nwz, -caveHalfZ, caveHalfZ)
        offsetX.current = nwx - slotWorldX
        offsetZ.current = nwz - slotWorldZ
        isWalking = step > 0.002
      } else if (
        cooldown.current <= 0 &&
        dDist >= STRIKE_NEAR &&
        dDist <= STRIKE_FAR
      ) {
        attackPhase.current = 'WINDUP'
        attackTimer.current = 0
        strikeDamageSent.current = false
      }
    }

    if (attackPhase.current !== 'IDLE') {
      attackTimer.current += delta

      const phase = attackPhase.current
      const at = attackTimer.current

      if (phase === 'WINDUP') {
        const p = Math.min(at / WINDUP_DUR, 1)
        if (p >= 1) {
          attackPhase.current = 'STRIKE'
          attackTimer.current = 0
        }
      } else if (phase === 'STRIKE') {
        const p = Math.min(at / STRIKE_DUR, 1)
        if (
          at >= STRIKE_DUR * STRIKE_DAMAGE_AT &&
          !strikeDamageSent.current
        ) {
          strikeDamageSent.current = true
          if (onStrikeHit) {
            const mwx = slotWorldX + offsetX.current
            const mwz = slotWorldZ + offsetZ.current
            const dd = Math.hypot(px - mwx, pz - mwz)
            if (dd <= STRIKE_FAR + 0.42 && dd >= STRIKE_NEAR - 0.32) {
              onStrikeHit()
            }
          }
        }
        if (p >= 1) {
          attackPhase.current = 'RECOVERY'
          attackTimer.current = 0
        }
      } else if (phase === 'RECOVERY') {
        const p = Math.min(at / RECOVERY_DUR, 1)
        if (p >= 1) {
          attackPhase.current = 'IDLE'
          cooldown.current = ATTACK_COOLDOWN
        }
      }
    }

    const inCombat = attackPhase.current !== 'IDLE'
    if (inCombat) {
      if (!combatAnimOn.current) {
        combatAnimOn.current = true
        attackAction?.reset()
        attackAction?.setEffectiveWeight(1)
        attackAction?.fadeIn(0.14).play()
        walkAction?.fadeOut(0.12)
      }
    } else {
      if (combatAnimOn.current) {
        combatAnimOn.current = false
        attackAction?.fadeOut(0.22)
        walkAction?.fadeIn(0.22)
      }
      if (walkAction) {
        if (isWalking) {
          walkAction.paused = false
          walkAction.timeScale = 1.05
        } else {
          walkAction.paused = true
          walkAction.time = 0
        }
      }
    }

    mixer.update(delta)

    if (chaseRef.current) {
      chaseRef.current.position.x = offsetX.current
      chaseRef.current.position.z = offsetZ.current
    }
    if (groupRotRef.current) {
      const mobWx = slotWorldX + offsetX.current
      const mobWz = slotWorldZ + offsetZ.current
      const rdx = px - mobWx
      const rdz = pz - mobWz
      groupRotRef.current.rotation.y = Math.atan2(rdx, rdz)
    }
  })

  return (
    <group ref={chaseRef}>
      <group ref={groupRotRef}>
        <primitive object={model} />
        {(onClick || onPointerDown) && (
          <mesh position={[0, 0.95 * bulk * MOB_MODEL_SCALE, 0]} onClick={onClick} onPointerDown={onPointerDown}>
            <sphereGeometry args={[hitRadius]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
      {children}
    </group>
  )
}

useGLTF.preload(GLB_URL)
