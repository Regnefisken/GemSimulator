/**
 * Bygger cave_stalker.glb (samme hierarki + idle/walk/attack som Cave Stalker-generator HTML).
 * Gab-punktlys udelades i eksport (spillets eget lys).
 * Kør: npx tsx scripts/buildCaveStalkerGlb.ts
 */
class NodeFileReader {
  result: ArrayBuffer | null = null
  onloadend: (() => void) | null = null
  readAsArrayBuffer(blob: Blob) {
    void blob
      .arrayBuffer()
      .then((ab) => {
        this.result = ab
        this.onloadend?.()
      })
      .catch((e) => {
        console.error(e)
      })
  }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
;(globalThis as any).FileReader = NodeFileReader

import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import * as THREE from 'three'
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js'

function buildStalker(): THREE.Group {
  const stalkerRoot = new THREE.Group()
  stalkerRoot.name = 'Cave_Stalker'

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0x242a30,
    roughness: 0.6,
    flatShading: true,
  })

  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xeeddcc,
    roughness: 0.4,
    metalness: 0.1,
    flatShading: true,
  })

  const mawMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xcc0000,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  })

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
  const pupilMat = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    emissive: 0xff0000,
    emissiveIntensity: 2.0,
  })

  const bodyGeo = new THREE.CylinderGeometry(0.2, 0.28, 0.6, 6)
  const headGeo = new THREE.BoxGeometry(0.25, 0.22, 0.35)
  const limbGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.45, 5)
  const clawGeo = new THREE.ConeGeometry(0.012, 0.18, 4)
  const eyeGeo = new THREE.SphereGeometry(0.035, 16, 16)
  const pupilGeo = new THREE.SphereGeometry(0.015, 16, 16)

  const spine = new THREE.Group()
  spine.name = 'Spine'
  spine.position.y = 0.65
  stalkerRoot.add(spine)

  const torso = new THREE.Mesh(bodyGeo, skinMat)
  torso.position.y = 0.3
  torso.rotation.x = 0.2
  torso.castShadow = true
  spine.add(torso)

  const headGroup = new THREE.Group()
  headGroup.name = 'Head'
  headGroup.position.set(0, 0.6, 0.1)
  spine.add(headGroup)

  const skull = new THREE.Mesh(headGeo, skinMat)
  skull.position.set(0, 0.12, 0.1)
  skull.castShadow = true
  headGroup.add(skull)

  const hornGeo = new THREE.ConeGeometry(0.04, 0.15, 4)
  const hornL = new THREE.Mesh(hornGeo, boneMat)
  hornL.position.set(-0.06, 0.26, 0.05)
  hornL.rotation.set(-0.3, 0, 0.2)

  const hornR = new THREE.Mesh(hornGeo, boneMat)
  hornR.position.set(0.06, 0.26, 0.05)
  hornR.rotation.set(-0.3, 0, -0.2)
  headGroup.add(hornL, hornR)

  const eyeL = new THREE.Mesh(eyeGeo, eyeMat)
  eyeL.position.set(-0.08, 0.18, 0.26)
  const pupilL = new THREE.Mesh(pupilGeo, pupilMat)
  pupilL.position.set(0, 0, 0.025)
  eyeL.add(pupilL)

  const eyeR = new THREE.Mesh(eyeGeo, eyeMat)
  eyeR.position.set(0.08, 0.18, 0.26)
  const pupilR = new THREE.Mesh(pupilGeo, pupilMat)
  pupilR.position.set(0, 0, 0.025)
  eyeR.add(pupilR)

  headGroup.add(eyeL, eyeR)

  const maw = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, 0.28), mawMat)
  maw.position.set(0, 0.0, 0.17)
  headGroup.add(maw)

  for (let i = 0; i < 4; i++) {
    const tooth1 = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 4), boneMat)
    tooth1.position.set(-0.08 + i * 0.05, 0.09, 0.28)
    tooth1.rotation.x = Math.PI / 2 + 0.2

    const tooth2 = tooth1.clone()
    tooth2.position.y = -0.06
    tooth2.rotation.x = Math.PI

    headGroup.add(tooth1, tooth2)
  }

  function createArm(isLeft: boolean) {
    const arm = new THREE.Group()
    arm.name = isLeft ? 'ArmL' : 'ArmR'
    const sign = isLeft ? 1 : -1
    arm.position.set(sign * 0.25, 0.5, 0.05)

    const upperArm = new THREE.Mesh(limbGeo, skinMat)
    upperArm.position.y = -0.2
    upperArm.rotation.z = sign * 0.2
    upperArm.castShadow = true
    arm.add(upperArm)

    const lowerArm = new THREE.Group()
    lowerArm.position.set(sign * 0.05, -0.4, 0)
    lowerArm.rotation.x = -0.2
    arm.add(lowerArm)

    const lowerArmMesh = new THREE.Mesh(limbGeo, skinMat)
    lowerArmMesh.position.y = -0.2
    lowerArmMesh.castShadow = true
    lowerArm.add(lowerArmMesh)

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.07), skinMat)
    palm.position.set(0, -0.42, 0)
    palm.castShadow = true
    lowerArm.add(palm)

    for (let i = 0; i < 3; i++) {
      const claw = new THREE.Mesh(clawGeo, boneMat)
      claw.position.set((i - 1) * 0.025, -0.52, 0.01)
      claw.rotation.x = Math.PI - 0.1
      lowerArm.add(claw)
    }

    return arm
  }
  spine.add(createArm(true))
  spine.add(createArm(false))

  function createLeg(isLeft: boolean) {
    const leg = new THREE.Group()
    leg.name = isLeft ? 'LegL' : 'LegR'
    const sign = isLeft ? 1 : -1

    leg.position.set(sign * 0.15, 0.6, 0)

    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.05, 0.3, 5), skinMat)
    thigh.position.set(0, -0.15, 0.05)
    thigh.rotation.x = 0.2
    thigh.castShadow = true
    leg.add(thigh)

    const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.035, 0.3, 5), skinMat)
    calf.position.set(0, -0.4, -0.02)
    calf.rotation.x = -0.2
    calf.castShadow = true
    leg.add(calf)

    const foot = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.05, 0.2), skinMat)
    foot.position.set(0, -0.55, 0.05)
    foot.castShadow = true
    leg.add(foot)

    return leg
  }
  stalkerRoot.add(createLeg(true))
  stalkerRoot.add(createLeg(false))

  return stalkerRoot
}

function createAnimationClips(): THREE.AnimationClip[] {
  const q = new THREE.Quaternion()
  const euler = new THREE.Euler()

  function makeQuatTrack(name: string, times: number[], eulerAngles: [number, number, number][]) {
    const values: number[] = []
    eulerAngles.forEach((ang) => {
      q.setFromEuler(euler.set(ang[0], ang[1], ang[2]))
      values.push(q.x, q.y, q.z, q.w)
    })
    return new THREE.QuaternionKeyframeTrack(`${name}.quaternion`, times, values)
  }

  function makePosTrack(name: string, times: number[], positions: [number, number, number][]) {
    const values: number[] = []
    positions.forEach((p) => values.push(p[0], p[1], p[2]))
    return new THREE.VectorKeyframeTrack(`${name}.position`, times, values)
  }

  const idleTimes = [0, 1.0, 2.0]
  const tIdle = [
    makePosTrack('Spine', idleTimes, [
      [0, 0.65, 0],
      [0, 0.62, 0],
      [0, 0.65, 0],
    ]),
    makeQuatTrack('Spine', idleTimes, [
      [0, 0, 0],
      [0.05, 0, 0],
      [0, 0, 0],
    ]),
    makeQuatTrack('Head', idleTimes, [
      [0, 0, 0],
      [-0.1, 0.05, 0],
      [0, 0, 0],
    ]),
    makeQuatTrack('ArmL', idleTimes, [
      [0.1, 0, 0],
      [0.15, 0, 0.05],
      [0.1, 0, 0],
    ]),
    makeQuatTrack('ArmR', idleTimes, [
      [0.1, 0, 0],
      [0.15, 0, -0.05],
      [0.1, 0, 0],
    ]),
  ]
  const clipIdle = new THREE.AnimationClip('idle', 2.0, tIdle)

  const walkTimes = [0, 0.375, 0.75, 1.125, 1.5]
  const tWalk = [
    makePosTrack('Spine', walkTimes, [
      [0, 0.6, 0],
      [0, 0.65, 0],
      [0, 0.6, 0],
      [0, 0.65, 0],
      [0, 0.6, 0],
    ]),
    makeQuatTrack('Spine', walkTimes, [
      [0.2, 0.1, 0],
      [0.2, 0, 0.05],
      [0.2, -0.1, 0],
      [0.2, 0, -0.05],
      [0.2, 0.1, 0],
    ]),
    makeQuatTrack('LegL', walkTimes, [
      [-0.4, 0, 0],
      [0.2, 0, 0],
      [0.4, 0, 0],
      [0, 0, 0],
      [-0.4, 0, 0],
    ]),
    makeQuatTrack('LegR', walkTimes, [
      [0.4, 0, 0],
      [0, 0, 0],
      [-0.4, 0, 0],
      [0.2, 0, 0],
      [0.4, 0, 0],
    ]),
    makeQuatTrack('ArmL', walkTimes, [
      [0.5, 0, 0],
      [0, 0, 0],
      [-0.4, 0, 0],
      [0, 0, 0],
      [0.5, 0, 0],
    ]),
    makeQuatTrack('ArmR', walkTimes, [
      [-0.4, 0, 0],
      [0, 0, 0],
      [0.5, 0, 0],
      [0, 0, 0],
      [-0.4, 0, 0],
    ]),
    makeQuatTrack('Head', walkTimes, [
      [-0.2, -0.1, 0],
      [-0.2, 0, 0],
      [-0.2, 0.1, 0],
      [-0.2, 0, 0],
      [-0.2, -0.1, 0],
    ]),
  ]
  const clipWalk = new THREE.AnimationClip('walk', 1.5, tWalk)

  const attackTimes = [0, 0.4, 0.6, 0.9, 1.2]
  const tAttack = [
    makePosTrack('Spine', attackTimes, [
      [0, 0.65, 0],
      [0, 0.75, -0.2],
      [0, 0.5, 0.4],
      [0, 0.5, 0.4],
      [0, 0.65, 0],
    ]),
    makeQuatTrack('Spine', attackTimes, [
      [0, 0, 0],
      [-0.3, 0, 0],
      [0.5, 0, 0],
      [0.5, 0, 0],
      [0, 0, 0],
    ]),
    makeQuatTrack('ArmL', attackTimes, [
      [0.1, 0, 0],
      [-1.5, -0.5, -0.5],
      [1.0, 0.5, 0.5],
      [0.8, 0.2, 0.2],
      [0.1, 0, 0],
    ]),
    makeQuatTrack('ArmR', attackTimes, [
      [0.1, 0, 0],
      [-1.5, 0.5, 0.5],
      [1.0, -0.5, -0.5],
      [0.8, -0.2, -0.2],
      [0.1, 0, 0],
    ]),
    makeQuatTrack('Head', attackTimes, [
      [0, 0, 0],
      [-0.4, 0, 0],
      [0.6, 0, 0],
      [0.6, 0, 0],
      [0, 0, 0],
    ]),
  ]
  const clipAttack = new THREE.AnimationClip('attack', 1.2, tAttack)

  return [clipIdle, clipWalk, clipAttack]
}

function disposeTree(root: THREE.Object3D) {
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.geometry?.dispose()
      const m = o.material
      if (Array.isArray(m)) m.forEach((x) => x.dispose())
      else m?.dispose()
    }
  })
}

async function main() {
  const root = buildStalker()
  const clips = createAnimationClips()

  const exporter = new GLTFExporter()
  const glb = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      root,
      (result) => {
        if (result instanceof ArrayBuffer) resolve(result)
        else reject(new Error('Forventede binær GLB-output'))
      },
      (err) => reject(err),
      { binary: true, animations: clips, onlyVisible: true, truncateDrawRange: true },
    )
  })

  const outDir = join(dirname(fileURLToPath(import.meta.url)), '../public/assets/mobs')
  mkdirSync(outDir, { recursive: true })
  const outPath = join(outDir, 'cave_stalker.glb')
  writeFileSync(outPath, Buffer.from(glb))
  disposeTree(root)
  console.log('Skrev', outPath, `(${glb.byteLength} bytes)`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
