type PatternCtx = {
  data: string[]
  rng: () => number
  noise: (x: number, y: number) => number
}

function cloneRows(data: string[]): string[][] {
  return data.map((row) => row.split(''))
}

function joinRows(grid: string[][]): string[] {
  return grid.map((row) => row.join(''))
}

const GEM_BODY = new Set(['G', 'D', 'L', 'W', 'P', 'V', 'S'])

function bresenham(x0: number, y0: number, x1: number, y1: number): [number, number][] {
  const out: [number, number][] = []
  let x = x0
  let y = y0
  const dx = Math.abs(x1 - x0)
  const dy = -Math.abs(y1 - y0)
  const sx = x0 < x1 ? 1 : -1
  const sy = y0 < y1 ? 1 : -1
  let err = dx + dy
  for (;;) {
    out.push([x, y])
    if (x === x1 && y === y1) break
    const e2 = 2 * err
    if (e2 >= dy) {
      err += dy
      x += sx
    }
    if (e2 <= dx) {
      err += dx
      y += sy
    }
  }
  return out
}

export function applyVeining(ctx: PatternCtx, density = 0.08): string[] {
  const grid = cloneRows(ctx.data)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x]
      if ((ch === 'G' || ch === 'D') && Math.abs(ctx.noise(x * 0.3, y * 0.3)) < density) {
        grid[y][x] = 'V'
      }
    }
  }
  return joinRows(grid)
}

export function applyBanding(ctx: PatternCtx, orientation: 'h' | 'v', count = 6): string[] {
  const grid = cloneRows(ctx.data)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = grid[y][x]
      if (!GEM_BODY.has(ch) && ch !== 'C') continue
      const u = orientation === 'h' ? x : y
      const v = orientation === 'h' ? y : x
      const wave = ctx.noise(v * 0.12, u * 0.08) * 2.5
      const band = Math.floor((u + wave) / 2) % count
      const useLight = band % 2 === 0
      if (ch === 'G' || ch === 'D' || ch === 'L' || ch === 'P') {
        grid[y][x] = useLight ? 'L' : 'D'
      }
    }
  }
  return joinRows(grid)
}

export function applySpeckles(ctx: PatternCtx, density = 0.015): string[] {
  const grid = cloneRows(ctx.data)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (grid[y][x] === 'G' && ctx.rng() < density) grid[y][x] = 'C'
    }
  }
  return joinRows(grid)
}

function centroidBody(data: string[]): { cx: number; cy: number } | null {
  let sx = 0
  let sy = 0
  let n = 0
  const h = data.length
  const w = data[0]?.length ?? 0
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const ch = data[y][x]
      if (ch === 'G' || ch === 'D') {
        sx += x
        sy += y
        n++
      }
    }
  }
  if (n === 0) return null
  return { cx: sx / n, cy: sy / n }
}

export function applyAsterism(ctx: PatternCtx): string[] {
  const grid = cloneRows(ctx.data)
  const c = centroidBody(ctx.data)
  if (!c) return ctx.data
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const rays = 6
  for (let r = 0; r < rays; r++) {
    const ang = (Math.PI * 2 * r) / rays
    const dx = Math.cos(ang)
    const dy = Math.sin(ang)
    for (let step = 1; step < 24; step++) {
      const x = Math.round(c.cx + dx * step)
      const y = Math.round(c.cy + dy * step)
      if (x < 0 || y < 0 || x >= w || y >= h) break
      const ch = grid[y][x]
      if (ch === '.' || ch === 'O') break
      if (ch === 'W' || ch === 'L') grid[y][x] = 'S'
    }
  }
  return joinRows(grid)
}

export function applyChatoyancy(ctx: PatternCtx): string[] {
  const grid = cloneRows(ctx.data)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const c = centroidBody(ctx.data)
  if (!c) return ctx.data
  const horizontal = ctx.rng() < 0.5
  const x0 = horizontal ? 0 : Math.round(c.cx)
  const y0 = horizontal ? Math.round(c.cy) : 0
  const x1 = horizontal ? w - 1 : Math.round(c.cx)
  const y1 = horizontal ? Math.round(c.cy) : h - 1
  const line = bresenham(x0, y0, x1, y1)
  const usable = line.filter(([x, y]) => x >= 0 && y >= 0 && x < w && y < h && grid[y][x] !== '.' && grid[y][x] !== 'O')
  if (usable.length < 3) return ctx.data
  for (let i = 0; i < usable.length; i++) {
    const [x, y] = usable[i]!
    const ch = grid[y][x]
    if (!GEM_BODY.has(ch) && ch !== 'C') continue
    const t = i / (usable.length - 1)
    if (t < 0.12 || t > 0.88) grid[y][x] = 'S'
    else if (t > 0.38 && t < 0.62) grid[y][x] = 'W'
    else grid[y][x] = 'S'
  }
  return joinRows(grid)
}

export function applyOpalescence(ctx: PatternCtx): string[] {
  const grid = cloneRows(ctx.data)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const clusters = 8 + Math.floor(ctx.rng() * 5)
  for (let k = 0; k < clusters; k++) {
    const cx = 2 + Math.floor(ctx.rng() * (w - 4))
    const cy = 2 + Math.floor(ctx.rng() * (h - 4))
    for (let dy = 0; dy < 2; dy++) {
      for (let dx = 0; dx < 2; dx++) {
        const x = cx + dx
        const y = cy + dy
        const ch = grid[y]?.[x]
        if (ch === 'G' || ch === 'L') {
          grid[y][x] = ctx.rng() < 0.5 ? 'W' : 'P'
        }
      }
    }
  }
  return joinRows(grid)
}

function edgeCells(data: string[]): [number, number][] {
  const h = data.length
  const w = data[0]?.length ?? 0
  const out: [number, number][] = []
  const neigh = [
    [0, 1],
    [0, -1],
    [1, 0],
    [-1, 0],
  ]
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[y][x] === '.') continue
      let touchesVoid = false
      for (const [dx, dy] of neigh) {
        const nx = x + dx
        const ny = y + dy
        if (nx < 0 || ny < 0 || nx >= w || ny >= h || data[ny][nx] === '.') {
          touchesVoid = true
          break
        }
      }
      if (touchesVoid) out.push([x, y])
    }
  }
  return out
}

const CRACK_SKIP = new Set(['O', 'X', '1', '2', '3', '.'])

export function applyCracks(ctx: PatternCtx, count?: number): string[] {
  const grid = cloneRows(ctx.data)
  const h = grid.length
  const w = grid[0]?.length ?? 0
  const n = count ?? 1 + Math.floor(ctx.rng() * 3)
  const edges = edgeCells(joinRows(grid))
  if (edges.length < 2) return ctx.data

  for (let c = 0; c < n; c++) {
    const a = edges[Math.floor(ctx.rng() * edges.length)]!
    let b = edges[Math.floor(ctx.rng() * edges.length)]!
    let guard = 0
    while ((a[0] === b[0] && a[1] === b[1]) && guard++ < 12) {
      b = edges[Math.floor(ctx.rng() * edges.length)]!
    }
    const line = bresenham(a[0], a[1], b[0], b[1])
    for (const [x, y] of line) {
      if (x < 0 || y < 0 || x >= w || y >= h) continue
      const ch = grid[y][x]
      if (!CRACK_SKIP.has(ch)) grid[y][x] = 'C'
    }
  }
  return joinRows(grid)
}
