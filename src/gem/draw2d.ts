import type { ColorMap } from '../types'

export function drawGem(canvas: HTMLCanvasElement, data: string[], colorMap: ColorMap, scale = 20): void {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const width = data[0].length
  const height = data.length

  canvas.width = width * scale
  canvas.height = height * scale
  ctx.clearRect(0, 0, canvas.width, canvas.height)

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const char = data[y][x]
      if (char !== '.') {
        ctx.fillStyle = colorMap[char] ?? '#000000'
        ctx.fillRect(x * scale, y * scale, scale, scale)
      }
    }
  }
}
