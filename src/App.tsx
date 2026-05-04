import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import type { Gem } from './types'
import { createPreloadGem, createRandomGem } from './gem/generate'
import { loadCollection, saveCollection } from './lib/storage'
import { TEMPLATES } from './data/templates'
import Header from './components/Header'
import GemViewer from './components/GemViewer'
import Collection from './components/Collection'
import type { VoxelSceneHandle } from './components/VoxelScene'

export default function App() {
  const [collection, setCollection] = useState<Gem[]>(() => {
    const saved = loadCollection()
    if (saved.length > 0) return saved
    const first = createRandomGem()
    return [first, ...Array.from({ length: 5 }, (_, i) => createPreloadGem(i))]
  })

  const [currentGem, setCurrentGem] = useState<Gem | null>(() => loadCollection()[0] ?? null)
  const voxelRef = useRef<VoxelSceneHandle>(null)

  useLayoutEffect(() => {
    setCurrentGem((c) => c ?? collection[0] ?? null)
  }, [collection])

  useEffect(() => {
    saveCollection(collection)
  }, [collection])

  function handleGenerate() {
    const gem = createRandomGem()
    setCurrentGem(gem)
    setCollection((prev) => [gem, ...prev].slice(0, 40))
  }

  function handleSelectGem(gem: Gem) {
    setCurrentGem(gem)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleDownload() {
    if (!currentGem || !voxelRef.current) return
    const url = voxelRef.current.toDataURL()
    const a = document.createElement('a')
    let filename = currentGem.name.replace(/ /g, '_')
    if (currentGem.magicProperty) filename += `_${currentGem.magicProperty.name}`
    a.download = `${filename}_${currentGem.timestamp}.png`
    a.href = url
    a.click()
  }

  function handleClear() {
    if (confirm('Slet hele samlingen?')) {
      setCollection([])
      setCurrentGem(null)
    }
  }

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
      <Header templateCount={TEMPLATES.length} />
      <GemViewer
        gem={currentGem}
        voxelRef={voxelRef}
        onGenerate={handleGenerate}
        onDownload={handleDownload}
      />
      {collection.length > 1 && (
        <Collection gems={collection} onSelect={handleSelectGem} onClear={handleClear} />
      )}
    </div>
  )
}
