import { useEffect, useRef, useState } from 'react'
import type { Character } from './types.ts'
import HoverTooltip from './HoverTooltip'
import { assetMap } from '../data/assetMap'

type Props = {
  character: Character
  x: number
  y: number
  size?: number
  speed?: number // px per second
}

export default function CharacterSprite({ character, x, y, size = 64, speed = 200 }: Props) {
  const ref = useRef<HTMLDivElement | null>(null)
  const prev = useRef<{ x: number; y: number } | null>(null)
  const [isMoving, setIsMoving] = useState(false)
  const [facing, setFacing] = useState<'left' | 'right'>('right')

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prevPos = prev.current
    const cur = { x, y }

    // If first placement, just teleport (no transition)
    if (!prevPos) {
      el.style.transition = 'none'
      el.style.transform = `translate(${x}px, ${y}px)`
      prev.current = cur
      return
    }

    const dx = x - prevPos.x
    const dy = y - prevPos.y
    const dist = Math.hypot(dx, dy)
    const duration = Math.max(0.05, dist / speed) // seconds

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
    el.style.transition = `transform ${duration}s linear`
    // apply transform on next frame to ensure transition applies
    requestAnimationFrame(() => {
      el.style.transform = `translate(${x}px, ${y}px)`
    })

    prev.current = cur

    return () => {
      el.removeEventListener('transitionend', onTransitionEnd)
    }
  }, [x, y, speed])

  const cid = (character as any).character_id;
  if(!cid) {
    return null;
  }

  const assets = assetMap[cid]

  return (
    <div
      ref={ref}
      className="character"
      style={{
        width: size,
        height: size,
        position: 'absolute',
        transform: `translate(${x}px, ${y}px)`,
        willChange: 'transform'
      }}
      title={character.name}
    >
      <HoverTooltip title={character.name} content={JSON.stringify(character, null, 2)}>
        <div style={{ position: 'relative', width: '100%', height: '100%' }}>
          <img
            src={isMoving ? assets.walk : assets.idle}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              transform: facing === 'left' ? 'scaleX(-1)' : 'none'
            }}
          />
        </div>
      </HoverTooltip>
    </div>
  )
}
