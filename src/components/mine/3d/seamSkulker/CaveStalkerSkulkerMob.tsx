import { useEffect, useLayoutEffect, useMemo, useRef, type ReactNode } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import {
  MOB_ATTACK_COOLDOWN,
  MOB_CHASE_SPEED,
  MOB_COMBAT_OUTER,
  MOB_RECOVERY_DUR,
  MOB_RETREAT_SPEED,
  MOB_STRIKE_DAMAGE_AT,
  MOB_STRIKE_DUR,
  MOB_STRIKE_FAR,
  MOB_STRIKE_NEAR,
  MOB_TOO_CLOSE,
  MOB_STEP_MOVED_EPS,
  MOB_WINDUP_DUR,
} from './mobCombatConstants'
import { SEAM_SKULKER_SCALE_MUL } from './seamSkulkerScale'

/** HP-badge over cave stalker (~1.35 m model — tæt på crystal beast efter skalering). */
export function caveStalkerHpLabelLocalY(bulk: number): number {
  return bulk * SEAM_SKULKER_SCALE_MUL * 5.48
}

const MOB_MODEL_SCALE = SEAM_SKULKER_SCALE_MUL

type AttackPhase = 'IDLE' | 'WINDUP' | 'STRIKE' | 'RECOVERY'

type Props = {
  bulk: number
  visualSeed: number
  slotWorldX: number
  slotWorldZ: number
  caveHalfX: number
  caveHalfZ: number
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  onStrikeHit?: () => void
  children?: ReactNode
  onPlanarOffset?: (dx: number, dz: number) => void
}

const GLB_URL = '/assets/mobs/cave_stalker.glb'

export default function CaveStalkerSkulkerMob({
  bulk,
  visualSeed,
  slotWorldX,
  slotWorldZ,
  caveHalfX,
  caveHalfZ,
  onClick,
  onPointerDown,
  onStrikeHit,
  onPlanarOffset,
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

  const { idleAction, walkAction, attackAction } = useMemo(() => {
    const idleClip = animations.find((c) => c.name === 'idle')
    const walkClip = animations.find((c) => c.name === 'walk')
    const attackClip = animations.find((c) => c.name === 'attack')
    return {
      idleAction: idleClip ? mixer.clipAction(idleClip) : null,
      walkAction: walkClip ? mixer.clipAction(walkClip) : null,
      attackAction: attackClip ? mixer.clipAction(attackClip) : null,
    }
  }, [mixer, animations])

  useEffect(() => {
    idleAction?.setLoop(THREE.LoopRepeat, Infinity)
    walkAction?.setLoop(THREE.LoopRepeat, Infinity)
    attackAction?.setLoop(THREE.LoopOnce, 1)
    if (attackAction) attackAction.clampWhenFinished = true

    idleAction?.play()
    idleAction?.setEffectiveWeight(1)
    walkAction?.play()
    walkAction?.setEffectiveWeight(0)
    attackAction?.play()
    attackAction?.setEffectiveWeight(0)

    return () => {
      mixer.stopAllAction()
      mixer.uncacheRoot(model)
    }
  }, [mixer, model, idleAction, walkAction, attackAction])

  const chaseRef = useRef<THREE.Group>(null)
  const groupRotRef = useRef<THREE.Group>(null)
  const offsetX = useRef(0)
  const offsetZ = useRef(0)

  const attackPhase = useRef<AttackPhase>('IDLE')
  const attackTimer = useRef(0)
  const cooldown = useRef((visualSeed % 97) * 0.01)

  const strikeDamageSent = useRef(false)

  const combatAnimOn = useRef(false)
  const locoRef = useRef<'idle' | 'walk'>('idle')
  const prevInCombatRef = useRef(false)

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

      const canStartAttack =
        cooldown.current <= 0 && dDist >= MOB_STRIKE_NEAR && dDist <= MOB_STRIKE_FAR

      if (canStartAttack) {
        attackPhase.current = 'WINDUP'
        attackTimer.current = 0
        strikeDamageSent.current = false
      } else if (dDist < MOB_TOO_CLOSE && dDist > 1e-5) {
        const step = Math.min(MOB_RETREAT_SPEED * delta, MOB_TOO_CLOSE - dDist + 0.12)
        let nwx = mobWx - nx * step
        let nwz = mobWz - nz * step
        nwx = THREE.MathUtils.clamp(nwx, -caveHalfX, caveHalfX)
        nwz = THREE.MathUtils.clamp(nwz, -caveHalfZ, caveHalfZ)
        offsetX.current = nwx - slotWorldX
        offsetZ.current = nwz - slotWorldZ
        isWalking = step > MOB_STEP_MOVED_EPS
      } else if (dDist > MOB_COMBAT_OUTER) {
        const step = Math.min(MOB_CHASE_SPEED * delta, dDist - MOB_COMBAT_OUTER)
        let nwx = mobWx + nx * step
        let nwz = mobWz + nz * step
        nwx = THREE.MathUtils.clamp(nwx, -caveHalfX, caveHalfX)
        nwz = THREE.MathUtils.clamp(nwz, -caveHalfZ, caveHalfZ)
        offsetX.current = nwx - slotWorldX
        offsetZ.current = nwz - slotWorldZ
        isWalking = step > MOB_STEP_MOVED_EPS
      }
    }

    if (attackPhase.current !== 'IDLE') {
      attackTimer.current += delta

      const phase = attackPhase.current
      const at = attackTimer.current

      if (phase === 'WINDUP') {
        const p = Math.min(at / MOB_WINDUP_DUR, 1)
        if (p >= 1) {
          attackPhase.current = 'STRIKE'
          attackTimer.current = 0
        }
      } else if (phase === 'STRIKE') {
        const p = Math.min(at / MOB_STRIKE_DUR, 1)
        if (
          at >= MOB_STRIKE_DUR * MOB_STRIKE_DAMAGE_AT &&
          !strikeDamageSent.current
        ) {
          strikeDamageSent.current = true
          if (onStrikeHit) {
            const mwx = slotWorldX + offsetX.current
            const mwz = slotWorldZ + offsetZ.current
            const dd = Math.hypot(px - mwx, pz - mwz)
            if (dd <= MOB_STRIKE_FAR + 0.42 && dd >= MOB_STRIKE_NEAR - 0.32) {
              onStrikeHit()
            }
          }
        }
        if (p >= 1) {
          attackPhase.current = 'RECOVERY'
          attackTimer.current = 0
        }
      } else if (phase === 'RECOVERY') {
        const p = Math.min(at / MOB_RECOVERY_DUR, 1)
        if (p >= 1) {
          attackPhase.current = 'IDLE'
          cooldown.current = MOB_ATTACK_COOLDOWN
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
        idleAction?.fadeOut(0.12)
        walkAction?.fadeOut(0.12)
      }
    } else {
      if (prevInCombatRef.current) {
        combatAnimOn.current = false
        attackAction?.fadeOut(0.22)
        if (isWalking) {
          idleAction?.fadeOut(0.2)
          walkAction?.reset().fadeIn(0.2).play()
          locoRef.current = 'walk'
        } else {
          walkAction?.fadeOut(0.2)
          idleAction?.fadeIn(0.2).play()
          locoRef.current = 'idle'
        }
      } else {
        const wantLoco = isWalking ? 'walk' : 'idle'
        if (wantLoco !== locoRef.current) {
          locoRef.current = wantLoco
          if (wantLoco === 'walk') {
            idleAction?.fadeOut(0.2)
            walkAction?.reset().fadeIn(0.2).play()
          } else {
            walkAction?.fadeOut(0.2)
            idleAction?.fadeIn(0.2).play()
          }
        }
      }

      if (walkAction && locoRef.current === 'walk') {
        walkAction.timeScale = 1.05
      }
    }

    prevInCombatRef.current = inCombat

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

    onPlanarOffset?.(offsetX.current, offsetZ.current)
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
