import './style.css'
import { createPreloadGem, createRandomGem } from './gem/generate'
import { drawGem } from './gem/draw2d'
import { VoxelGemView } from './gem/voxelScene'
import type { Gem } from './types'
import { TEMPLATES } from './data/templates'

let collection: Gem[] = []
let currentGem: Gem | null = null
let voxelView: VoxelGemView | null = null

function generateRandomGem(): void {
  const btn = document.getElementById('generate-btn')
  if (btn) {
    btn.style.transform = 'scale(0.95)'
    setTimeout(() => {
      btn.style.transform = 'scale(1)'
    }, 120)
  }

  const gem = createRandomGem()
  currentGem = gem
  collection.unshift(gem)
  if (collection.length > 40) collection.pop()

  renderCurrentGem()
  renderCollection()
}

function renderCurrentGem(): void {
  if (!currentGem || !voxelView) return

  voxelView.setGem(currentGem.data, currentGem.colorMap)

  let nameHTML = currentGem.name

  if (currentGem.purity === 4 && currentGem.karat) {
    nameHTML = `<span class="star-3">★★★★</span> ${currentGem.karat}K ${nameHTML}`
  } else if (currentGem.purity === 3) {
    nameHTML = `<span class="star-3">★★★</span> ${nameHTML}`
  } else if (currentGem.purity === 1) {
    nameHTML = `★ ${nameHTML}`
  } else if (currentGem.isGodTier) {
    nameHTML = `<span class="text-amber-300">✦</span> ${nameHTML}`
  }

  const nameEl = document.getElementById('current-name')
  if (nameEl) nameEl.innerHTML = nameHTML

  const timeEl = document.getElementById('current-time')
  if (timeEl) timeEl.textContent = `Slebet: ${currentGem.timestamp}`

  const propsEl = document.getElementById('current-properties')
  const glowEl = document.getElementById('glow-layer')
  if (!propsEl || !glowEl) return

  glowEl.className =
    'absolute inset-0 blur-3xl opacity-25 rounded-3xl pointer-events-none transition-all'

  if (currentGem.magicProperty) {
    const mp = currentGem.magicProperty
    propsEl.innerHTML = `
      <span class="px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-wider ${mp.color}">
        ${mp.icon} ${mp.name}
      </span>
    `
    glowEl.style.backgroundColor = mp.glow
    glowEl.style.opacity = '0.6'
    if (mp.name === 'Radioaktiv') {
      glowEl.classList.add('glow-radioactive')
    } else {
      glowEl.classList.add('gem-glow')
    }
  } else {
    propsEl.innerHTML = ''
    glowEl.style.backgroundColor = currentGem.colorMap.G ?? '#eab308'
    glowEl.style.opacity =
      currentGem.purity === 4 || currentGem.purity === 3 || currentGem.isGodTier ? '0.48' : '0.25'
    if (currentGem.purity === 4 || currentGem.purity === 3 || currentGem.isGodTier) {
      glowEl.classList.add('gem-glow')
    }
  }

  if (collection.length > 1) {
    document.getElementById('collection-section')?.classList.remove('hidden')
  }
}

function renderCollection(): void {
  const container = document.getElementById('collection-grid')
  if (!container) return
  container.innerHTML = ''
  const countEl = document.getElementById('collection-count')
  if (countEl) countEl.textContent = `(${collection.length})`

  collection.forEach((gem, index) => {
    const div = document.createElement('div')
    const specialBorder =
      gem.magicProperty?.name === 'Radioaktiv'
        ? 'border-lime-500/50 hover:border-lime-400 shadow-[0_0_8px_rgba(132,204,22,0.3)]'
        : 'border-slate-700 hover:border-slate-500'
    div.className = `group bg-slate-800/70 hover:bg-slate-700 border rounded-2xl p-3 cursor-pointer transition-all flex flex-col items-center ${specialBorder} ${index === 0 ? 'ring-2 ring-amber-400/60' : ''}`

    const smallCanvas = document.createElement('canvas')
    smallCanvas.width = 80
    smallCanvas.height = 80
    smallCanvas.className = 'pixelated mb-3 group-hover:scale-105 transition-transform'
    drawGem(smallCanvas, gem.data, gem.colorMap, 5)

    const nameEl = document.createElement('div')
    nameEl.className = 'text-xs font-medium text-center leading-tight text-slate-300 group-hover:text-white'
    let displayName = gem.name
    if (gem.purity === 4 && gem.karat) {
      displayName = `★★★★ ${gem.karat}K ${displayName}`
    } else if (gem.purity === 3) {
      displayName = `★★★ ${displayName}`
    } else if (gem.purity === 1) {
      displayName = `★ ${displayName}`
    }
    nameEl.textContent = displayName

    if (gem.magicProperty) {
      const magicEl = document.createElement('div')
      magicEl.className = `text-[10px] mt-1 font-bold ${gem.magicProperty.name === 'Radioaktiv' ? 'text-lime-400 animate-pulse' : 'text-slate-400'}`
      magicEl.textContent = `${gem.magicProperty.icon} ${gem.magicProperty.name}`
      nameEl.appendChild(magicEl)
    }

    const timeEl = document.createElement('div')
    timeEl.className = 'text-[10px] font-mono text-slate-500 mt-1'
    timeEl.textContent = gem.timestamp

    div.append(smallCanvas, nameEl, timeEl)
    div.addEventListener('click', () => {
      currentGem = gem
      renderCurrentGem()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
    container.appendChild(div)
  })
}

function downloadCurrentGem(): void {
  if (!currentGem || !voxelView) return
  const link = document.createElement('a')
  let filename = currentGem.name.replace(/ /g, '_')
  if (currentGem.magicProperty) filename += `_${currentGem.magicProperty.name}`
  link.download = `${filename}_${currentGem.timestamp}.png`
  link.href = voxelView.toDataURL('image/png')
  link.click()
}

function clearCollection(): void {
  if (confirm('Slet hele samlingen?')) {
    collection = []
    document.getElementById('collection-section')?.classList.add('hidden')
    renderCollection()
  }
}

function mount(): void {
  const root = document.querySelector<HTMLDivElement>('#app')
  if (!root) return

  root.innerHTML = `
    <div class="max-w-6xl mx-auto p-6 md:p-12 space-y-12">
      <header class="text-center space-y-4">
        <h1 class="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 via-pink-400 to-amber-400 bg-clip-text text-transparent tracking-tighter">
          Den Magiske Ædelstens Smedje
        </h1>
        <p class="text-slate-400 max-w-md mx-auto text-lg">
          14 ædelstenstyper • <span id="shape-count-label">mange</span> former • Guldklumper • <span class="text-fuchsia-400">Magiske Egenskaber</span>
        </p>
      </header>

      <section class="flex flex-col items-center">
        <div id="gem-wrapper" class="relative gem-container bg-slate-800 p-8 rounded-3xl border-4 border-slate-700 shadow-2xl w-fit">
          <div id="glow-layer" class="absolute inset-0 blur-3xl opacity-25 rounded-3xl pointer-events-none transition-all"></div>
          <div class="relative z-10 flex flex-col items-center">
            <div class="bg-slate-950 p-5 rounded-2xl shadow-inner border border-slate-600 mb-6 relative">
              <div id="voxel-host" class="w-[320px] h-[320px] overflow-hidden rounded-sm"></div>
            </div>
            <div class="text-center">
              <h2 id="current-name" class="text-3xl font-bold tracking-widest mb-1"></h2>
              <div id="current-properties" class="flex flex-wrap justify-center gap-2 mb-3 min-h-[24px]"></div>
              <div class="flex items-center justify-center gap-3 text-sm">
                <span id="current-time" class="px-5 py-1 bg-slate-700 rounded-full font-mono text-slate-300"></span>
                <button id="download-btn" type="button"
                  class="flex items-center gap-1.5 px-4 py-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-semibold text-xs rounded-2xl transition-colors">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M4 16v-4m0 0l4 4m-4-4l4-4m12 0v4m0 0l-4-4m4 4l-4 4" />
                  </svg>
                  PNG
                </button>
              </div>
            </div>
          </div>
        </div>

        <button type="button" id="generate-btn"
          class="mt-10 px-10 py-5 bg-gradient-to-r from-violet-500 to-fuchsia-600 hover:from-violet-400 hover:to-fuchsia-500 text-white font-bold text-xl rounded-3xl shadow-2xl flex items-center gap-x-4 transition-all active:scale-95">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.25">
            <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132z" />
            <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 4.01V8" />
          </svg>
          <span>Slib Ny Ædelsten</span>
        </button>
      </section>

      <section id="collection-section" class="hidden pt-8 border-t border-slate-700">
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-2xl font-semibold flex items-center gap-3">
            <span class="text-amber-400">✦</span>
            Din Samling
            <span id="collection-count" class="text-slate-400 text-sm font-mono bg-slate-800 px-3 py-0.5 rounded-full"></span>
          </h3>
          <button type="button" id="clear-btn" class="text-xs px-4 py-2 text-slate-400 hover:text-slate-300 flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M6 18L18 6M6 6h12v12" />
            </svg>
            Ryd
          </button>
        </div>
        <div id="collection-grid" class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4"></div>
      </section>
    </div>
  `

  const host = document.getElementById('voxel-host')
  if (host) {
    voxelView = new VoxelGemView(host)
  }

  const shapeLbl = document.getElementById('shape-count-label')
  if (shapeLbl) shapeLbl.textContent = String(TEMPLATES.length)

  document.getElementById('generate-btn')?.addEventListener('click', () => generateRandomGem())
  document.getElementById('download-btn')?.addEventListener('click', () => downloadCurrentGem())
  document.getElementById('clear-btn')?.addEventListener('click', () => clearCollection())

  generateRandomGem()

  setTimeout(() => {
    for (let i = 0; i < 5; i++) {
      collection.push(createPreloadGem(i))
    }
    renderCollection()
  }, 700)
}

mount()
