import { useEffect, useMemo, useState } from 'react'
import CharacterSprite from './CharacterSprite'
import './world.css'
import type { Character } from './types.ts'
import { sortBy } from 'lodash-es'

import charactersData from '../data/characters.json'

const WORLD_SIZE = 2000
const CHARACTER_SIZE = 64
const SPEED = 200 // px per second

const SORT_OPTIONS: { value: string; label: string }[] = [
  { value: 'date_created', label: 'created date' },
  { value: 'age', label: 'age' },
  { value: 'color', label: 'hue' },

  { value: 'goodness', label: 'goodness' }
]

export default function World() {
  const characters = useMemo(() => charactersData as Character[], [])
  const n = characters.length
  const [arrangeBy, setArrangeBy] = useState('date_created')

  // store positions by name
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  // Y positions are randomized on every arrangement (no caching)

  // helpers for color sorting (hex -> RGB, RGB -> HSL)
  function hexToRgb(hex?: string | null) {
    if (!hex) return null
    const s = String(hex).replace('#', '').trim()
    if (s.length === 3) {
      return {
        r: parseInt(s[0] + s[0], 16),
        g: parseInt(s[1] + s[1], 16),
        b: parseInt(s[2] + s[2], 16)
      }
    }
    if (s.length >= 6) {
      return {
        r: parseInt(s.slice(0, 2), 16),
        g: parseInt(s.slice(2, 4), 16),
        b: parseInt(s.slice(4, 6), 16)
      }
    }
    return null
  }

  function rgbToHsl(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255
    const max = Math.max(r, g, b), min = Math.min(r, g, b)
    let h = 0, s = 0
    const l = (max + min) / 2
    if (max !== min) {
      const d = max - min
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break
        case g: h = (b - r) / d + 2; break
        case b: h = (r - g) / d + 4; break
      }
      h /= 6
    }
    return { h: h * 360, s, l }
  }

  // compute sort value (used with lodash's sortBy)
  const computeSortValue = (c: Character) => {
    const key = arrangeBy
    const v = (c as any)[key]

    if (key === 'date_created') {
      return v ? Date.parse(String(v)) : -Infinity
    }

    if (key === 'age') {
      return v == null ? Infinity : Number(v)
    }

    if (key === 'color') {
      const rgb = hexToRgb(String(v))
      if (!rgb) return 0
      const { h, l } = rgbToHsl(rgb.r, rgb.g, rgb.b)
      // primary by hue (0..360) and tie-break with lightness (0..1)
      // scale to integer so sortBy can compare numeric values
      return Math.round(h * 1000 + l * 100)
    }

    if (key === 'goodness') {
      return v == null ? -Infinity : Number(v)
    }

    return 0
  }

  // core positioning function (exposed globally)
  const positionCharacters = (sortKey?: string) => {
    if (sortKey) setArrangeBy(sortKey)

    // sort using lodash-es sortBy with computed values
    const sorted = sortBy(characters, (c) => computeSortValue(c))

    const margin = 20
    const usable = WORLD_SIZE - margin * 2 - CHARACTER_SIZE
    const spacing = n > 1 ? usable / (n - 1) : 0

    const next: Record<string, { x: number; y: number }> = {}

    sorted.forEach((c, i) => {
      const x = margin + Math.round(i * spacing)
      // y randomized each time
      const y = Math.floor(Math.random() * (WORLD_SIZE - CHARACTER_SIZE - margin * 2)) + margin
      next[c.name] = { x, y }
    })

    setPositions((prev) => ({ ...prev, ...next }))
  }

  // expose global
  useEffect(() => {
    ;(window as any).positionCharacters = positionCharacters
    // initial placement
    positionCharacters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // when arrangeBy changes, reposition
  useEffect(() => {
    positionCharacters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangeBy])

  return (
    <div className="world-wrap">
      <div className="world" style={{ width: WORLD_SIZE, height: WORLD_SIZE }}>
        <div className="controls">
          <label>
            <select
              value={arrangeBy}
              onChange={(e) => setArrangeBy(e.target.value)}
              style={{ marginLeft: 8 }}
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {characters.map((c) => {
          const p = positions[c.name] || { x: Math.random() * (WORLD_SIZE - CHARACTER_SIZE), y: Math.random() * (WORLD_SIZE - CHARACTER_SIZE) }
          return (
            <CharacterSprite
              key={c.name}
              character={c}
              x={p.x}
              y={p.y}
              size={64}
              speed={SPEED}
            />
          )
        })}
      </div>
    </div>
  )
}
