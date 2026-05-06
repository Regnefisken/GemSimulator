import { useMemo } from 'react'
import type { Gem, MetalName } from '../../types'
import { buildJewelryVoxel3d } from '../../gem/drawJewelry3d'
import VoxelScene from '../VoxelScene'

type Props = {
  blueprintId: string
  gems: Gem[]
  rimMetal: MetalName
  className?: string
  /** Lidt højere tilt for at fremhæve dybde. */
  tilt?: number
}

export default function JewelryViewer({ blueprintId, gems, rimMetal, className, tilt = 0.45 }: Props) {
  const voxel3d = useMemo(() => buildJewelryVoxel3d(blueprintId, gems, rimMetal), [blueprintId, gems, rimMetal])
  return (
    <VoxelScene
      mode="3d"
      voxel3d={voxel3d}
      className={className}
      cameraTilt={tilt}
      canvasStyle={{ width: '100%', height: '100%' }}
    />
  )
}
