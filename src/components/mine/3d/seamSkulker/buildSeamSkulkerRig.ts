import * as THREE from 'three'

const COLOR_SKIN = 0x6b6c6e
const COLOR_BRUISE = 0x5b4b66
const COLOR_FUNGAL = 0x7a7a40
const COLOR_BONE = 0xa0a095

export type SeamSkulkerLeg = {
  hip: THREE.Group
  thigh: THREE.Group
  knee: THREE.Group
  foot: THREE.Group
}

/** Alle led til procedural animation */
export type SeamSkulkerRigParts = {
  master: THREE.Group
  pelvis: THREE.Group
  lowerSpine: THREE.Group
  upperSpine: THREE.Group
  ribcage: THREE.Group
  neck: THREE.Group
  head: THREE.Group
  lLeg: SeamSkulkerLeg
  rLeg: SeamSkulkerLeg
  lShoulder: THREE.Group
  rShoulder: THREE.Group
  lArm: THREE.Group
  lElbow: THREE.Group
  lForearm: THREE.Group
  lHand: THREE.Group
  rArm: THREE.Group
  rElbow: THREE.Group
  rForearm: THREE.Group
  rHand: THREE.Group
}

function createJoint(
  geometry: THREE.BufferGeometry | null,
  material: THREE.Material | null,
  attachYOffset: number,
): THREE.Group {
  const group = new THREE.Group()
  if (geometry && material) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.position.y = attachYOffset
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }
  return group
}

function buildLeg(
  isRight: boolean,
  skin: THREE.MeshStandardMaterial,
  bone: THREE.MeshStandardMaterial,
): SeamSkulkerLeg {
  const sign = isRight ? 1 : -1
  const hip = new THREE.Group()
  hip.position.set(sign * 0.4, -0.2, 0)

  const thigh = createJoint(
    new THREE.CylinderGeometry(0.2, 0.15, 1.2, 5),
    skin,
    -0.6,
  )
  hip.add(thigh)

  const knee = new THREE.Group()
  knee.position.y = -1.2
  const calfGeo = new THREE.CylinderGeometry(0.15, 0.1, 1.3, 5)
  const calf = createJoint(calfGeo, bone, -0.65)
  knee.add(calf)
  thigh.add(knee)

  const foot = createJoint(new THREE.BoxGeometry(0.3, 0.2, 0.6), skin, -0.1)
  foot.position.y = -1.3
  foot.position.z = 0.1
  knee.add(foot)

  return { hip, thigh, knee, foot }
}

export function buildSeamSkulkerRig(): { rig: SeamSkulkerRigParts; dispose: () => void } {
  const materials = {
    skin: new THREE.MeshStandardMaterial({
      color: COLOR_SKIN,
      flatShading: true,
      roughness: 0.8,
    }),
    ribs: new THREE.MeshStandardMaterial({
      color: COLOR_BRUISE,
      flatShading: true,
      roughness: 0.9,
    }),
    fungal: new THREE.MeshStandardMaterial({
      color: COLOR_FUNGAL,
      flatShading: true,
      roughness: 1,
    }),
    darkHole: new THREE.MeshBasicMaterial({ color: 0x050505 }),
    bone: new THREE.MeshStandardMaterial({
      color: COLOR_BONE,
      flatShading: true,
      roughness: 0.7,
    }),
  }

  const rig = {} as SeamSkulkerRigParts
  rig.master = new THREE.Group()

  rig.pelvis = createJoint(new THREE.BoxGeometry(0.8, 0.5, 0.6), materials.skin, 0)
  rig.pelvis.position.y = 2.5
  rig.master.add(rig.pelvis)

  rig.lowerSpine = createJoint(new THREE.CylinderGeometry(0.3, 0.4, 0.8, 6), materials.skin, 0.4)
  rig.lowerSpine.position.y = 0.2
  rig.pelvis.add(rig.lowerSpine)

  rig.upperSpine = createJoint(null, null, 0)
  rig.upperSpine.position.y = 0.8
  rig.lowerSpine.add(rig.upperSpine)

  const ribGeo = new THREE.CylinderGeometry(0.7, 0.4, 1.2, 7)
  rig.ribcage = createJoint(ribGeo, materials.ribs, 0.6)
  rig.upperSpine.add(rig.ribcage)

  rig.neck = createJoint(new THREE.CylinderGeometry(0.15, 0.2, 0.6, 5), materials.skin, 0.3)
  rig.neck.position.y = 1.1
  rig.ribcage.add(rig.neck)

  const headGeo = new THREE.IcosahedronGeometry(0.5, 1)
  rig.head = createJoint(headGeo, materials.skin, 0.3)
  rig.neck.add(rig.head)

  const eyeGeo = new THREE.BoxGeometry(0.2, 0.15, 0.2)
  const lEye = new THREE.Mesh(eyeGeo, materials.darkHole)
  lEye.position.set(-0.2, 0.4, 0.4)
  rig.head.add(lEye)
  const rEye = new THREE.Mesh(eyeGeo.clone(), materials.darkHole)
  rEye.position.set(0.2, 0.4, 0.4)
  rig.head.add(rEye)

  const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  const lPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), pupilMat)
  lPupil.position.set(0, 0, 0.08)
  lEye.add(lPupil)
  const rPupil = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), pupilMat)
  rPupil.position.set(0, 0, 0.08)
  rEye.add(rPupil)

  const jawGeo = new THREE.BoxGeometry(0.1, 0.3, 0.2)
  const jaw = new THREE.Mesh(jawGeo, materials.darkHole)
  jaw.position.set(0, 0.1, 0.45)
  rig.head.add(jaw)

  rig.lLeg = buildLeg(false, materials.skin, materials.bone)
  rig.rLeg = buildLeg(true, materials.skin, materials.bone)
  rig.pelvis.add(rig.lLeg.hip)
  rig.pelvis.add(rig.rLeg.hip)

  rig.lShoulder = new THREE.Group()
  rig.lShoulder.position.set(-0.25, 0.8, 0)
  rig.ribcage.add(rig.lShoulder)
  rig.lArm = createJoint(new THREE.CylinderGeometry(0.15, 0.1, 1.0, 5), materials.skin, -0.5)
  rig.lShoulder.add(rig.lArm)
  rig.lElbow = new THREE.Group()
  rig.lElbow.position.y = -1.0
  rig.lArm.add(rig.lElbow)
  rig.lForearm = createJoint(new THREE.CylinderGeometry(0.1, 0.08, 1.2, 5), materials.skin, -0.6)
  rig.lElbow.add(rig.lForearm)
  rig.lHand = createJoint(new THREE.BoxGeometry(0.3, 0.4, 0.3), materials.skin, -0.2)
  rig.lHand.position.y = -1.2
  rig.lForearm.add(rig.lHand)

  rig.rShoulder = new THREE.Group()
  rig.rShoulder.position.set(0.35, 0.9, 0)
  rig.ribcage.add(rig.rShoulder)
  rig.rArm = createJoint(new THREE.CylinderGeometry(0.3, 0.25, 1.4, 6), materials.fungal, -0.7)
  rig.rShoulder.add(rig.rArm)
  rig.rElbow = new THREE.Group()
  rig.rElbow.position.y = -1.4
  rig.rArm.add(rig.rElbow)
  rig.rForearm = createJoint(new THREE.CylinderGeometry(0.35, 0.4, 1.6, 6), materials.skin, -0.8)
  rig.rElbow.add(rig.rForearm)
  rig.rHand = createJoint(new THREE.BoxGeometry(0.8, 1.0, 0.8), materials.bone, -0.5)
  rig.rHand.position.y = -1.6
  rig.rForearm.add(rig.rHand)

  rig.pelvis.rotation.x = 0.3
  rig.lowerSpine.rotation.x = 0.4
  rig.upperSpine.rotation.x = 0.5
  rig.neck.rotation.x = -0.6

  rig.lLeg.hip.rotation.x = -0.4
  rig.lLeg.knee.rotation.x = 0.6
  rig.lLeg.foot.rotation.x = -0.2
  rig.rLeg.hip.rotation.x = -0.5
  rig.rLeg.knee.rotation.x = 0.8
  rig.rLeg.foot.rotation.x = -0.3

  rig.lShoulder.rotation.x = 0.6
  rig.lShoulder.rotation.z = -0.3
  rig.lElbow.rotation.x = -0.4
  rig.rShoulder.rotation.x = 0.6
  rig.rShoulder.rotation.z = 0.3
  rig.rElbow.rotation.x = -0.4

  const matList = [...Object.values(materials), pupilMat]
  const dispose = () => {
    for (const m of matList) m.dispose()
    rig.master.traverse((o) => {
      if (o instanceof THREE.Mesh && o.geometry) o.geometry.dispose()
    })
  }

  return { rig, dispose }
}
