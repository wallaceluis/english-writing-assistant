// Draws the app and tray icons without any image dependency: `npm run icons`.
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { deflateSync } from 'node:zlib'

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../resources')

// Geometry on a 24x24 grid, mirrored by src/renderer/src/components/Logo.tsx.
const GRID = 24
const BACKGROUND = { min: 1, max: 23, radius: 6 }
const GRADIENT = [
  [0x63, 0x66, 0xf1],
  [0x38, 0xbd, 0xf8]
]
const STROKE_HALF_WIDTH = 1.1
const STROKES = [
  [8.5, 7.5, 8.5, 16.5],
  [8.5, 7.5, 15.5, 7.5],
  [8.5, 12, 13.5, 12],
  [8.5, 16.5, 15.5, 16.5]
]
const SAMPLES = 4

function insideBackground(x, y) {
  const center = (BACKGROUND.min + BACKGROUND.max) / 2
  const inner = (BACKGROUND.max - BACKGROUND.min) / 2 - BACKGROUND.radius
  const dx = Math.max(Math.abs(x - center) - inner, 0)
  const dy = Math.max(Math.abs(y - center) - inner, 0)
  return Math.hypot(dx, dy) <= BACKGROUND.radius
}

function insideStroke(x, y) {
  return STROKES.some(([x1, y1, x2, y2]) => {
    const lengthSq = (x2 - x1) ** 2 + (y2 - y1) ** 2
    const t = Math.min(1, Math.max(0, ((x - x1) * (x2 - x1) + (y - y1) * (y2 - y1)) / lengthSq))
    return Math.hypot(x - (x1 + t * (x2 - x1)), y - (y1 + t * (y2 - y1))) <= STROKE_HALF_WIDTH
  })
}

function render(size) {
  const pixels = Buffer.alloc(size * size * 4)
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let background = 0
      let stroke = 0
      for (let sy = 0; sy < SAMPLES; sy++) {
        for (let sx = 0; sx < SAMPLES; sx++) {
          const x = ((px + (sx + 0.5) / SAMPLES) / size) * GRID
          const y = ((py + (sy + 0.5) / SAMPLES) / size) * GRID
          if (!insideBackground(x, y)) continue
          background++
          if (insideStroke(x, y)) stroke++
        }
      }
      if (background === 0) continue

      const t = Math.min(1, Math.max(0, (px + py) / (2 * size)))
      const white = stroke / background
      const offset = (py * size + px) * 4
      for (let channel = 0; channel < 3; channel++) {
        const base = GRADIENT[0][channel] + (GRADIENT[1][channel] - GRADIENT[0][channel]) * t
        pixels[offset + channel] = Math.round(base + (255 - base) * white)
      }
      pixels[offset + 3] = Math.round((background / SAMPLES ** 2) * 255)
    }
  }
  return pixels
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let crc = 0xffffffff
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length)
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([length, body, crc])
}

function encodePng(size, pixels) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(size, 0)
  header.writeUInt32BE(size, 4)
  header.set([8, 6, 0, 0, 0], 8) // 8-bit RGBA

  const rowLength = size * 4 + 1
  const raw = Buffer.alloc(rowLength * size)
  for (let y = 0; y < size; y++) {
    pixels.copy(raw, y * rowLength + 1, y * size * 4, (y + 1) * size * 4)
  }

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}

mkdirSync(outDir, { recursive: true })
for (const [name, size] of [
  ['icon.png', 512],
  ['tray.png', 32]
]) {
  writeFileSync(resolve(outDir, name), encodePng(size, render(size)))
  console.log(`resources/${name} (${size}x${size})`)
}
