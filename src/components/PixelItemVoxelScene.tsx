import { useMemo, type CSSProperties } from 'react'
import type { PixelItem } from '../types'
import { buildPixelItemVoxel3d } from '../gem/drawGem3d'
import VoxelScene from './VoxelScene'

type Props = {
  item: PixelItem
  className?: string
  canvasStyle?: CSSProperties
  /** Som ædelsten-forhåndsvisning (`GemViewer`). */
  cameraTilt?: number
  /** Små kort uden orbit (auto-spin som 2d-varianten). */
  disableOrbitControls?: boolean
}

/** 3D-voxel preview fra samme 2D-plade som inventory-kort (`buildGemVoxel3d`-logik). */
export default function PixelItemVoxelScene({
  item,
  className,
  canvasStyle,
  cameraTilt = 0.35,
  disableOrbitControls,
}: Props) {
  const voxel3d = useMemo(() => buildPixelItemVoxel3d(item), [item])
  if (!item.data.length) return null
  return (
    <VoxelScene
      mode="3d"
      voxel3d={voxel3d}
      className={className}
      canvasStyle={canvasStyle}
      cameraTilt={cameraTilt}
      disableOrbitControls={disableOrbitControls}
    />
  )
}
