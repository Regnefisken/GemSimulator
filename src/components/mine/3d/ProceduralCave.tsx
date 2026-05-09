import type { CaveConfig } from '../../../types'
import CaveWalls from './cave/CaveWalls'
import CrystalClusters from './cave/CrystalClusters'
import DustParticles from './cave/DustParticles'
import Stalactites from './cave/Stalactites'

type Props = {
  caveConfig: CaveConfig
  seed: number
  hitTrigger?: number
  burstOrigin?: [number, number, number]
  maxParticles?: number
}

export default function ProceduralCave({
  caveConfig,
  seed,
  hitTrigger,
  burstOrigin,
  maxParticles,
}: Props) {
  return (
    <>
      <CaveWalls caveConfig={caveConfig} seed={seed} />
      <Stalactites caveConfig={caveConfig} seed={seed} />
      <CrystalClusters caveConfig={caveConfig} seed={seed} />
      <DustParticles seed={seed} hitTrigger={hitTrigger} burstOrigin={burstOrigin} maxParticles={maxParticles} />
    </>
  )
}
