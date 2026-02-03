import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import './world.css'
import type { Character } from './types'
import { sortBy } from 'lodash-es'

import charactersData from '../data/characters.json'
import SvgCharacter from './SvgCharacter'

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
  const characters = useMemo(() => {
    // Duplicate charactersData 40x, suffixing character_id for uniqueness
    const base: Character[] = charactersData as Character[];
    const result: Character[] = [];
    for (let i = 0; i < 40; i++) {
      for (const c of base) {
        result.push({
          ...c,
          character_id: `${c.character_id}_${i}`,
          name: `${c.name} ${i}`,
        });
      }
    }
    return result;
  }, [])

  const n = characters.length
  const [arrangeBy, setArrangeBy] = useState('date_created')

  // store positions by name
  const [positions, setPositions] = useState<Record<string, { x: number; y: number }>>({})

  // pan/zoom state (world units with viewBox)
  // zoom.k: scale (1 = entire WORLD_SIZE visible width-wise)
  // zoom.x, zoom.y: translation in world units (applied as translate(x, y) before scale)
  const [zoom, setZoom] = useState({ k: 1, x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement | null>(null)
  const dragging = useRef(false)
  const lastPos = useRef<{ x: number; y: number } | null>(null)
  const [viewport, setViewport] = useState({ w: 800, h: 600 })

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
    ; (window as any).positionCharacters = positionCharacters
    // initial placement
    positionCharacters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // when arrangeBy changes, reposition
  useEffect(() => {
    positionCharacters()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [arrangeBy])

  // measure viewport
  useEffect(() => {
    function measure() {
      const el = containerRef.current
      if (!el) return
      setViewport({ w: el.clientWidth, h: el.clientHeight })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [])

  // screen->world conversion factor
  const screenToWorld = WORLD_SIZE / viewport.w

  // panning
  const onMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true
    lastPos.current = { x: e.clientX, y: e.clientY }
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current || !lastPos.current) return
    const dx = e.clientX - lastPos.current.x
    const dy = e.clientY - lastPos.current.y
    lastPos.current = { x: e.clientX, y: e.clientY }
    // convert screen delta (px) to world delta
    setZoom((z) => ({ ...z, x: z.x + dx * screenToWorld / z.k, y: z.y + dy * screenToWorld / z.k }))
  }, [screenToWorld])

  const onMouseUp = useCallback(() => {
    dragging.current = false
    lastPos.current = null
  }, [])

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    const el = containerRef.current
    if (!el) return
    // zoom about cursor (screen px -> world units)
    const rect = el.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    setZoom((z) => {
      const wheel = e.deltaY
      const scaleFactor = Math.exp(-wheel * 0.001)
      const newK = Math.min(6, Math.max(0.25, z.k * scaleFactor))
      // compute delta to keep same world point under cursor
      // t' = t + (mouse_screen / S) * (1/newK - 1/z.k)
      const inv = (1 / newK - 1 / z.k)
      const dxWorld = (mouseX * screenToWorld) * inv
      const dyWorld = (mouseY * screenToWorld) * inv
      return { k: newK, x: z.x + dxWorld, y: z.y + dyWorld }
    })
  }, [screenToWorld])

  // minimap controls
  const MINI = 160
  const miniScale = MINI / WORLD_SIZE
  // viewport in world units: left/top point and width/height in world coords
  const viewportWorld = {
    x: -zoom.x,
    y: -zoom.y,
    w: WORLD_SIZE / zoom.k,
    h: WORLD_SIZE / zoom.k
  }

  const onMiniClick = useCallback((e: React.MouseEvent) => {
    const el = e.currentTarget as SVGSVGElement
    const pt = el.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = el.getScreenCTM()?.inverse()
    if (!ctm) return
    const p = pt.matrixTransform(ctm)
    // p is in mini coords, map to world coords
    const worldX = p.x / miniScale
    const worldY = p.y / miniScale
    // center viewport on clicked point (keep current zoom.k)
    setZoom((z) => ({ ...z, x: -(worldX - (WORLD_SIZE / (2 * z.k))), y: -(worldY - (WORLD_SIZE / (2 * z.k))) }))
  }, [miniScale])

  return (
    <div
      className="world"
      ref={containerRef}
      style={{ width: '100vw', height: '100vh' }}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onWheel={onWheel}
    >
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
        <button onClick={() => setZoom({ k: 1, x: 0, y: 0 })} style={{ marginLeft: 8 }}>Reset</button>
      </div>

      <svg width={viewport.w} height={viewport.h} viewBox={`0 0 ${WORLD_SIZE} ${WORLD_SIZE}`} style={{ display: 'block' }}>
        {/* background grid */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(0,0,0,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width={WORLD_SIZE} height={WORLD_SIZE} fill="url(#grid)" />

        {/* pan/zoom transform (zoom.x/y in world units) */}
        <g transform={`translate(${zoom.x}, ${zoom.y}) scale(${zoom.k})`}>
          {characters.map((c) => {
            const p = positions[c.name] || { x: Math.random() * (WORLD_SIZE - CHARACTER_SIZE), y: Math.random() * (WORLD_SIZE - CHARACTER_SIZE) }
            return (
              <g key={c.name}>
                <g transform={`translate(${p.x}, ${p.y})`}>
                  <SvgCharacter character={c} x={p.x} y={p.y} size={CHARACTER_SIZE} speed={SPEED} />
                </g>
              </g>
            )
          })}
        </g>
      </svg>

      {/* minimap */}
      <div className="minimap" style={{ position: 'absolute', right: 12, bottom: 12 }}>
        <svg width={MINI} height={MINI} onClick={onMiniClick} style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid rgba(0,0,0,0.08)', borderRadius: 6 }}>
          <rect x={0} y={0} width={MINI} height={MINI} fill="#fff" />
          {/* characters in minimap (as simple colored dots by their color) */}
          {characters.map((c) => {
            const p = positions[c.name] || { x: 0, y: 0 }
            const cx = p.x * miniScale
            const cy = p.y * miniScale
            return <circle key={c.name} cx={cx} cy={cy} r={3} fill={c.color || '#999'} />
          })}
          {/* viewport rectangle */}
          <rect
            x={viewportWorld.x * miniScale}
            y={viewportWorld.y * miniScale}
            width={Math.max(2, viewportWorld.w * miniScale)}
            height={Math.max(2, viewportWorld.h * miniScale)}
            fill="rgba(0,0,0,0.06)"
            stroke="rgba(0,0,0,0.2)"
          />
        </svg>
      </div>
    </div>
  )
}
