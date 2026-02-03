import { useRef, useEffect } from 'react';
import { useLoader, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface SpriteSheetMeshProps {
  url: string;
  frameWidth: number;
  frameHeight: number;
  numFrames: number;
  fps?: number;
  facing?: 'left' | 'right';
  size?: number;
}

export function SpriteSheetMesh({
  url,
  frameWidth,
  frameHeight,
  numFrames,
  fps = 24,
  facing = 'right',
  size = 64,
}: SpriteSheetMeshProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useLoader(THREE.TextureLoader, url);
  const frame = useRef(0);
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
    if (lastTime.current >= frameDuration) {
      frame.current = (frame.current + 1) % numFrames;
      lastTime.current = 0;
    }
    // Set offset for vertical spritesheet
    texture.offset.y = frame.current / numFrames;
    texture.repeat.y = 1 / numFrames;
    texture.offset.x = 0;
    texture.repeat.x = 1;
  });

  return (
    <mesh ref={meshRef}>
      <planeGeometry args={[size, size]} />
      <meshBasicMaterial
        map={texture}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
