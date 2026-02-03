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
  // Remove isMoving and facing, not needed for idle animation
  const [frame, setFrame] = useState(0)

  // Only handle position update (no walking/facing logic)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.transform = `translate(${x}px, ${y}px)`
  }, [x, y])

  // Animation loop for idle spritesheet
  useEffect(() => {
    let animId: number
    let running = true
    function animate() {
      setFrame(f => (f + 1) % idleFrames)
      animId = window.setTimeout(animate, 1000 / 12) // 12 FPS
    }
    animate()
    return () => {
      running = false
      clearTimeout(animId)
    }
  }, [])

  const cid = (character as any).character_id;
  if (!cid) {
    return null;
  }
  const assets = assetMap[cid]
  const spriteWidth = character.sprite_width || size
  const spriteHeight = character.sprite_height || size
  const idleFrames = character.idle_frames || 1

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
        <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
          <img
            src={assets.idle}
            style={{
              position: 'absolute',
              left: -(frame * spriteWidth),
              top: 0,
              width: spriteWidth * idleFrames,
              height: spriteHeight,
              imageRendering: 'pixelated',
              pointerEvents: 'none',
              userSelect: 'none',
            }}
            draggable={false}
            alt={character.name}
          />
        </div>
      </HoverTooltip>
    </div>
  )
}
