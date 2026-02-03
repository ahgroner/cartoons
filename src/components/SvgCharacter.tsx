import { useEffect, useMemo, useRef, useState } from 'react'
import type { Character } from './types'
import { assetMap, type CharacterAssets } from '../data/assetMap'

type Props = {
  character: Character
  x: number
  y: number
  size?: number
  speed?: number
}

export default function SvgCharacter({ character, x, y, size = 64, speed = 200 }: Props) {
  const ref = useRef<SVGGElement | null>(null)
  const prev = useRef<{ x: number; y: number } | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [facing, setFacing] = useState<'left' | 'right'>('right')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prevPos = prev.current
    const cur = { x, y }

    // If first placement, teleport (no transition)
    if (!prevPos) {
      ;(el.style as any).transition = 'none'
      ;(el.style as any).transform = `translate(${x}px, ${y}px)`
      prev.current = cur
      return
    }

    const dx = x - prevPos.x
    const dy = y - prevPos.y
    const dist = Math.hypot(dx, dy)
    const duration = Math.max(0.05, dist / (speed || 200)) // seconds

    // Determine facing based on horizontal movement
    if (dx < 0) setFacing('left')
    else if (dx > 0) setFacing('right')

    // Listen for transition end to toggle walking state
    const onTransitionEnd = (ev: TransitionEvent) => {
      if (ev.propertyName !== 'transform') return
      setIsMoving(false)
    }

    el.addEventListener('transitionend', onTransitionEnd)

    // Start moving
    setIsMoving(true)
    ;(el.style as any).transition = `transform ${duration}s linear`
    // apply transform on next frame to ensure transition applies
    requestAnimationFrame(() => {
      ;(el.style as any).transform = `translate(${x}px, ${y}px)`
    })

    prev.current = cur

    return () => {
      el.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [x, y, speed])

  const cid = (character as any).character_id
  if (!cid) return null

  const characterAssets = useMemo(() => {
    const k = Object.keys(assetMap).find(key => cid.startsWith(key));
    return assetMap[k as any] || null;
  }, [cid]);

  if(!characterAssets) {
    console.log('Missing assets for character id:', cid);
    return null;
  }

  return (
    <g ref={ref} style={{ willChange: 'transform' }}>
      <image
        href={isMoving ? characterAssets.walk : characterAssets.idle}
        x={0}
        y={0}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid meet"
        style={{
          transform: facing === 'left' ? 'scaleX(-1)' : 'none',
          transformBox: 'fill-box',
          transformOrigin: 'center'
        }}
      />
    </g>
  )
}
