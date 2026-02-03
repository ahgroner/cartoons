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

  console.log(character)
  // Frame ranges
  const idleStart = 0;
  const idleEnd = character.idle_frames - 1;
  const walkStart = character.idle_frames;
  const walkEnd = character.idle_frames + character.walk_frames - 1;
  const totalFrames = character.idle_frames + character.walk_frames;

  console.log(assets.spritesheet)
  const texture = useLoader(THREE.TextureLoader, assets?.spritesheet);

  const frame = useRef(idleStart);
  const lastTime = useRef(0);

  // Set texture params
  useEffect(() => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
  }, [texture]);

  useFrame((_, delta) => {
    lastTime.current += delta;
    const frameDuration = 1 / fps;
    let startFrame = isWalking ? walkStart : idleStart;
    let endFrame = isWalking ? walkEnd : idleEnd;
    let numFrames = endFrame - startFrame + 1;
    // If switching between idle/walk, reset to startFrame
    if (frame.current < startFrame || frame.current > endFrame) {
      frame.current = startFrame;
    }
    if (lastTime.current >= frameDuration) {
      let relFrame = (frame.current - startFrame + 1) % numFrames;
      frame.current = startFrame + relFrame;
      lastTime.current = 0;
    }
    // Set offset for vertical spritesheet (original logic)
    texture.offset.y = frame.current / totalFrames;
    texture.repeat.y = 1 / totalFrames;
    texture.offset.x = 0;
    texture.repeat.x = 1;
  });

  console.log('SpriteSheetMesh geometry:', character.sprite_width, character.sprite_height);
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
