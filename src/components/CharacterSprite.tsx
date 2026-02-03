import { useRef, useEffect } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { assetMap } from '../data/assetMap';
import type { Character } from './types';

type CharacterSpriteProps = {
  character: Character;
  fps?: number;
  facing?: 'left' | 'right';
  isWalking?: boolean;
}

export const CharacterSprite = ({
  character,
  fps = 12,
  facing = 'right',
  isWalking = false,
}: CharacterSpriteProps) => {

  const meshRef = useRef<THREE.Mesh>(null);
  const assets = assetMap[character.character_id.replace(/_\d+$/, '')];

  // Frame ranges
  const idleStart = 0;
  const idleEnd = character.idle_frames - 1;
  const walkStart = character.idle_frames;
  const walkEnd = character.idle_frames + character.walk_frames - 1;
  const totalFrames = character.idle_frames + character.walk_frames;

  const texture = useLoader(THREE.TextureLoader, assets?.spritesheet);

  const frame = useRef(idleStart);
  const lastTime = useRef(0);
  const prevIsWalking = useRef(isWalking);

  // Set texture params
  useEffect(() => {
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame((_, delta) => {
    lastTime.current += delta;
    const frameDuration = 1 / fps;
    let frameRange = { start: 0, end: 0 };
    switch (isWalking) {
      case true:
        frameRange = { start: walkStart, end: walkEnd };
        break;
      case false:
        frameRange = { start: idleStart, end: idleEnd };
        break;
    }

    // Reset frame if animation state changes
    if (prevIsWalking.current !== isWalking) {
      frame.current = frameRange.start;
      prevIsWalking.current = isWalking;
    }

    if (lastTime.current >= frameDuration) {
      frame.current++;
      if (frame.current > frameRange.end) {
        frame.current = frameRange.start;
      }
      lastTime.current = 0;
    }

    texture.repeat.y = 1 / totalFrames;
    texture.offset.y = 1 - ((frame.current + 1) / totalFrames);
    texture.offset.x = 0;
    texture.repeat.x = 1;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[character.sprite_width, character.sprite_height]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
