import { useEffect, useMemo, useRef, type ReactNode } from 'react'
import { useFrame, useThree, type ThreeEvent } from '@react-three/fiber'
import * as THREE from 'three'
import { buildSeamSkulkerRig, type SeamSkulkerRigParts } from './buildSeamSkulkerRig'

type AttackPhase = 'IDLE' | 'WINDUP' | 'STRIKE' | 'RECOVERY'

/** Verdens-skala × halveret figur — samme faktor som rig `scale`. */
export const SEAM_SKULKER_SCALE_MUL = 0.34 * 0.5
/** Model-enheder fra grobund (≈ top af hoved + lidt luft) — matcher skaleret rig. */
const SEAM_SKULKER_HP_LABEL_MODEL_Y = 4.75

/** HP-badge lod over uhyre — brug i stedet for klippe-`labelBillboardY`. */
export function seamSkulkerHpLabelLocalY(bulk: number): number {
  return bulk * SEAM_SKULKER_SCALE_MUL * SEAM_SKULKER_HP_LABEL_MODEL_Y
}

const MOB_MODEL_SCALE = SEAM_SKULKER_SCALE_MUL
const CHASE_SPEED = 2.85
const RETREAT_SPEED = 2.65
/** Stop jagt her — holder afstand til spilleren. */
const COMBAT_OUTER = 1.86
/** Under dette: skub væk fra spilleren. */
const TOO_CLOSE = 1.24
const ATTACK_COOLDOWN = 2.25
const WINDUP_DUR = 0.55
const STRIKE_DUR = 0.2
const RECOVERY_DUR = 1.15
/** Slag rammer kun i dette bånd (xz-afstand til kamera). */
const STRIKE_NEAR = 1.38
const STRIKE_FAR = 2.02
/** Moment i STRIKE-fasen hvor skade registreres (synk med slam). */
const STRIKE_DAMAGE_AT = 0.42

function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type Props = {
  bulk: number
  visualSeed: number
  slotWorldX: number
  slotWorldZ: number
  caveBounds: number
  onClick?: (e: ThreeEvent<MouseEvent>) => void
  onPointerDown?: (e: ThreeEvent<PointerEvent>) => void
  /** Aktivt mål: ét slag pr. angreb når animationen rammer. */
  onStrikeHit?: () => void
  /** HP-bar m.m. — under jagt-gruppe så UI følger monstret. */
  children?: ReactNode
}

export default function SeamSkulkerMob({
  bulk,
  visualSeed,
  slotWorldX,
  slotWorldZ,
  caveBounds,
  onClick,
  onPointerDown,
  onStrikeHit,
  children,
}: Props) {
  const { camera } = useThree()
  const chaseRef = useRef<THREE.Group>(null)
  const groupRotRef = useRef<THREE.Group>(null)
  const offsetX = useRef(0)
  const offsetZ = useRef(0)

  const time = useRef(0)
  const attackPhase = useRef<AttackPhase>('IDLE')
  const attackTimer = useRef(0)
  const cooldown = useRef((visualSeed % 97) * 0.01)

  const twitchActive = useRef(false)
  const twitchTimer = useRef(0)
  const twitchType = useRef(1)
  const rng = useRef(mulberry32(visualSeed >>> 0))
  const strikeDamageSent = useRef(false)

  const { rig, dispose } = useMemo(() => buildSeamSkulkerRig(), [])
  useEffect(() => {
    return () => {
      dispose()
    }
  }, [dispose])

  const rigRef = useRef<SeamSkulkerRigParts>(rig)
  rigRef.current = rig

  const hitRadius = Math.max(0.55, 1.05 * bulk * MOB_MODEL_SCALE)

  useFrame((_, delta) => {
    const rigParts = rigRef.current
    time.current += delta

    const px = camera.position.x
    const pz = camera.position.z

    let pelX = 0
    let pelY = 2.5
    let pelZ = 0
    let pelRotX = 0.3
    let pelRotZ = 0
    let pelRotY = 0
    let upSpineRotX = 0.5
    let ribScale = 1
    let headRotX = 0
    let headRotY = 0
    let headRotZ = 0
    let rShoulderRotX = 0.6
    let rShoulderRotZ = 0.3
    let lShoulderRotX = 0.6
    let lShoulderRotZ = -0.3
    let lHipRotX = -0.4
    let rHipRotX = -0.5
    let isWalking = false

    const t = time.current

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
        nwx = THREE.MathUtils.clamp(nwx, -caveBounds, caveBounds)
        nwz = THREE.MathUtils.clamp(nwz, -caveBounds, caveBounds)
        offsetX.current = nwx - slotWorldX
        offsetZ.current = nwz - slotWorldZ
        isWalking = step > 0.002
      } else if (dDist > COMBAT_OUTER) {
        const step = Math.min(CHASE_SPEED * delta, dDist - COMBAT_OUTER)
        let nwx = mobWx + nx * step
        let nwz = mobWz + nz * step
        nwx = THREE.MathUtils.clamp(nwx, -caveBounds, caveBounds)
        nwz = THREE.MathUtils.clamp(nwz, -caveBounds, caveBounds)
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

      if (attackPhase.current === 'IDLE') {
        if (isWalking) {
          const walkSpeed = t * 1.5
          pelY = 2.3 + Math.sin(walkSpeed * 2.0) * 0.2
          pelX = Math.cos(walkSpeed) * 0.3
          pelRotZ = Math.cos(walkSpeed) * 0.15
          pelRotY = Math.sin(walkSpeed) * 0.1
          lHipRotX = -0.4 + Math.sin(walkSpeed) * 0.45
          rHipRotX = -0.5 + Math.sin(walkSpeed + Math.PI) * 0.45
          lShoulderRotX = 0.6 + Math.sin(walkSpeed + Math.PI) * 0.15
          rShoulderRotX = 0.6 + Math.sin(walkSpeed) * 0.08
          headRotY = -pelRotY * 0.5
          headRotX = Math.sin(walkSpeed * 2.0) * 0.05
        } else {
          const breathePhase = (t * Math.PI * 2) / 3.75
          const breatheExp = Math.sin(breathePhase) * 0.5 + 0.5
          ribScale = 1.0 + breatheExp * 0.12
          upSpineRotX = 0.5 + breatheExp * 0.15
          pelY = 2.5 - breatheExp * 0.1
          pelX = Math.sin(t * 1.2) * 0.2
          pelRotZ = Math.sin(t * 1.2) * 0.05
          rShoulderRotX = 0.6 + Math.sin(t * 1.2 + 1) * 0.1
          rShoulderRotZ = 0.3 + Math.sin(t * 1.2) * 0.05
          headRotY = Math.sin(t * 0.8) * 0.3
          headRotX = Math.cos(t * 1.6) * 0.15
          lShoulderRotX = 0.6 + Math.sin(t) * 0.05
        }

        if (!twitchActive.current && rng.current() < 0.003) {
          twitchActive.current = true
          twitchTimer.current = 0
          twitchType.current = rng.current() > 0.5 ? 1 : 2
        }

        if (twitchActive.current) {
          twitchTimer.current += delta
          const tProgress = twitchTimer.current / 0.2
          if (tProgress > 1) {
            twitchActive.current = false
          } else {
            const twitchIntensity = Math.sin(tProgress * Math.PI)
            if (twitchType.current === 1) {
              headRotZ += 0.26 * twitchIntensity
              headRotY += 0.2 * twitchIntensity
            } else {
              rigParts.rHand.scale.set(
                1 - 0.2 * twitchIntensity,
                1 - 0.2 * twitchIntensity,
                1 - 0.2 * twitchIntensity,
              )
            }
          }
        } else {
          rigParts.rHand.scale.set(1, 1, 1)
        }
      }
    }

    if (attackPhase.current !== 'IDLE') {
      attackTimer.current += delta
      rigParts.rHand.scale.set(1, 1, 1)
      ribScale = 1

      const phase = attackPhase.current
      const at = attackTimer.current

      if (phase === 'WINDUP') {
        const p = Math.min(at / WINDUP_DUR, 1)
        const ease = 1 - (1 - p) ** 3
        pelY = 2.5 + ease * 0.3
        pelRotX = 0.3 - ease * 0.4
        upSpineRotX = 0.5 - ease * 0.6
        rShoulderRotX = 0.6 - ease * 1.5
        rShoulderRotZ = 0.3 + ease * 0.5
        headRotX = -ease * 0.3
        if (p >= 1) {
          attackPhase.current = 'STRIKE'
          attackTimer.current = 0
        }
      } else if (phase === 'STRIKE') {
        const p = Math.min(at / STRIKE_DUR, 1)
        const ease = p * p
        pelY = 2.8 - ease * 1.2
        pelRotX = -0.1 + ease * 0.8
        upSpineRotX = -0.1 + ease * 1.2
        rShoulderRotX = -0.9 + ease * 2.5
        rShoulderRotZ = 0.8 - ease * 0.4
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
        const ease = 1 - (1 - p) ** 4
        pelY = 1.6 + ease * 0.9
        pelRotX = 0.7 - ease * 0.4
        upSpineRotX = 1.1 - ease * 0.6
        rShoulderRotX = 1.6 - ease * 1.0
        rShoulderRotZ = 0.4 - ease * 0.1
        if (p >= 1) {
          attackPhase.current = 'IDLE'
          cooldown.current = ATTACK_COOLDOWN
        }
      }
    }

    rigParts.pelvis.position.x = pelX
    rigParts.pelvis.position.y = pelY
    rigParts.pelvis.position.z = pelZ
    rigParts.pelvis.rotation.x = pelRotX
    rigParts.pelvis.rotation.y = pelRotY
    rigParts.pelvis.rotation.z = pelRotZ

    rigParts.upperSpine.rotation.x = upSpineRotX
    rigParts.ribcage.scale.set(ribScale, ribScale, ribScale)

    rigParts.head.rotation.x = headRotX
    rigParts.head.rotation.y = headRotY
    rigParts.head.rotation.z = headRotZ

    rigParts.rShoulder.rotation.x = rShoulderRotX
    rigParts.rShoulder.rotation.z = rShoulderRotZ
    rigParts.lShoulder.rotation.x = lShoulderRotX
    rigParts.lShoulder.rotation.z = lShoulderRotZ

    rigParts.lLeg.hip.rotation.x = lHipRotX
    rigParts.rLeg.hip.rotation.x = rHipRotX

    const groundDrop = 2.5 - pelY
    const walkPhase = t * 1.5
    const lWalkBend =
      attackPhase.current === 'IDLE' && isWalking ? Math.max(0, Math.sin(walkPhase)) * 0.6 : 0
    const rWalkBend =
      attackPhase.current === 'IDLE' && isWalking ? Math.max(0, Math.sin(walkPhase + Math.PI)) * 0.6 : 0

    rigParts.lLeg.knee.rotation.x = 0.6 + groundDrop * 1.0 + lWalkBend
    rigParts.rLeg.knee.rotation.x = 0.8 + groundDrop * 1.0 + rWalkBend

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

  const scale = bulk * MOB_MODEL_SCALE

  return (
    <group ref={chaseRef}>
      <group ref={groupRotRef}>
        <group scale={[scale, scale, scale]}>
          <primitive object={rig.master} />
        </group>
        {(onClick || onPointerDown) && (
          <mesh position={[0, 0.95 * scale, 0]} onClick={onClick} onPointerDown={onPointerDown}>
            <sphereGeometry args={[hitRadius]} />
            <meshBasicMaterial transparent opacity={0} depthWrite={false} />
          </mesh>
        )}
      </group>
      {children}
    </group>
  )
}
