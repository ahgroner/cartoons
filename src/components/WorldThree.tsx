import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import { sortBy } from 'lodash-es';
import type { Character } from './types';
import { assetMap } from '../data/assetMap';
import { CharacterSprite } from './CharacterSprite';
import charactersData from '../data/characters.json';

const WORLD_SIZE = 4000;

const AVG_CHARACTER_SIZE = 128

enum SORT_OPTIONS {
  DATE_CREATED = 'date_created',
  AGE = 'age',
  COLOR = 'color',
  GOODNESS = 'goodness'
}

function hexToRgb(hex?: string | null) {
  if (!hex) return null;
  const s = String(hex).replace('#', '').trim();
  if (s.length === 3) {
    return {
      r: parseInt(s[0] + s[0], 16),
      g: parseInt(s[1] + s[1], 16),
      b: parseInt(s[2] + s[2], 16)
    };
  }
  if (s.length >= 6) {
    return {
      r: parseInt(s.slice(0, 2), 16),
      g: parseInt(s.slice(2, 4), 16),
      b: parseInt(s.slice(4, 6), 16)
    };
  }
  return null;
}

function rgbToHsl(r: number, g: number, b: number) {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s, l };
}




function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function Characters({ characters, positions }: { characters: Character[]; positions: Record<string, { x: number; y: number }>; }) {
  const animatedPositions = useRef<Record<string, { x: number; y: number }>>({});
  const [, forceRerender] = useState(0);

  useEffect(() => {
    const next: Record<string, { x: number; y: number }> = {};
    for (const c of characters) {
      const p = positions[c.character_id];
      next[c.character_id] = { x: p.x, y: p.y };
    }
    animatedPositions.current = next;
    forceRerender((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [characters.length]);

  useFrame(() => {
    let changed = false;
    for (const c of characters) {
      const id = c.character_id;
      const target = positions[id];
      const current = animatedPositions.current[id] || { x: target.x, y: target.y };
      const nx = lerp(current.x, target.x, 0.15);
      const ny = lerp(current.y, target.y, 0.15);
      if (Math.abs(nx - target.x) > 0.5 || Math.abs(ny - target.y) > 0.5) {
        changed = true;
      }
      animatedPositions.current[id] = { x: nx, y: ny };
    }
    if (changed) forceRerender((n) => n + 1);
  });

  return (
    <>
      {characters.map((c) => {
        const p = animatedPositions.current[c.character_id] || positions[c.character_id];
        const assets = assetMap[c.character_id.replace(/_\d+$/, '')];
        const spritesheet = assets?.spritesheet;

        return (
          <group key={c.character_id} position={[p.x, p.y, 0]}>
            {spritesheet ? (
              <CharacterSprite
                character={c}
                facing='right'
              />
            ) : (
              <mesh>
                <planeGeometry args={[c.sprite_width, c.sprite_height]} />
                <meshBasicMaterial color={c.color || '#999'} />
              </mesh>
            )}
          </group>
        );
      })}
    </>
  );
}

export function WorldThree() {
  const [arrangeBy, setArrangeBy] = useState('date_created');
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const characters = useMemo(() => {
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
  }, []);

  const n = characters.length;

  const positions = useMemo(() => {
    const sorted = sortBy(characters, (c) => {
      const key = arrangeBy;
      const v = (c as any)[key];
      if (key === 'date_created') return v ? Date.parse(String(v)) : -Infinity;
      if (key === 'age') return v == null ? Infinity : Number(v);
      if (key === 'color') {
        const rgb = hexToRgb(String(v));
        if (!rgb) return 0;
        const { h, l } = rgbToHsl(rgb.r, rgb.g, rgb.b);
        return Math.round(h * 1000 + l * 100);
      }
      if (key === 'goodness') return v == null ? -Infinity : Number(v);
      return 0;
    });
    const margin = 20;
    const usable = WORLD_SIZE - margin * 2 - AVG_CHARACTER_SIZE;
    const spacing = n > 1 ? usable / (n - 1) : 0;
    const pos: Record<string, { x: number; y: number }> = {};
    sorted.forEach((c, i) => {
      const x = margin + Math.round(i * spacing);
      const y = Math.floor(Math.random() * (WORLD_SIZE - 1.5 * AVG_CHARACTER_SIZE - margin * 2)) + margin;
      pos[c.character_id] = { x, y };
    });
    return pos;
  }, [characters, arrangeBy, n]);

  // Camera controls
  function CameraController() {
    const { camera, size } = useThree();
    useFrame(() => {
      const aspect = size.width / size.height;
      const camHeight = WORLD_SIZE / zoom;
      const camWidth = camHeight * aspect;
      camera.left = -camWidth / 2 + offset.x;
      camera.right = camWidth / 2 + offset.x;
      camera.top = camHeight / 2 + offset.y;
      camera.bottom = -camHeight / 2 + offset.y;
      camera.position.set(WORLD_SIZE / 2, WORLD_SIZE / 2, 1000); // look straight down
      camera.up.set(0, 1, 0);
      camera.lookAt(WORLD_SIZE / 2, WORLD_SIZE / 2, 0);
      camera.updateProjectionMatrix();
    });
    return null;
  }

  // Mouse events for pan/zoom
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current || !lastPos.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setOffset((o) => ({ x: o.x - dx * zoom, y: o.y + dy * zoom }));
  };
  const onPointerUp = () => {
    dragging.current = false;
    lastPos.current = null;
  };
  const onWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((z) => Math.max(0.25, Math.min(6, z * Math.exp(-e.deltaY * 0.001))));
  };

  return (
    <div
      style={{ width: '100vw', height: '100vh', position: 'relative' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerLeave={onPointerUp}
      onWheel={onWheel}
    >
      <Canvas orthographic camera={{ position: [WORLD_SIZE / 2, WORLD_SIZE / 2, 1000], zoom: 1, near: 0.1, far: 10000 }} style={{ background: '#fff' }}>
        <CameraController />
        {/* Grid */}
        <gridHelper args={[WORLD_SIZE, WORLD_SIZE / 40, '#cccccc', '#eeeeee']} position={[WORLD_SIZE / 2, WORLD_SIZE / 2, 0]} />
        <Characters characters={characters} positions={positions} />
      </Canvas>
      <div className="controls" style={{ position: 'absolute', top: 10, left: 10, zIndex: 2 }}>
        <label>
          <select
            value={arrangeBy}
            onChange={(e) => setArrangeBy(e.target.value)}
            style={{ marginLeft: 8 }}
          >
            {Object.values(SORT_OPTIONS).map((o) => (
              <option key={o} value={o}>
                {o}
              </option>
            ))}
          </select>
        </label>
        <button onClick={() => { setZoom(1); setOffset({ x: 0, y: 0 }); }} style={{ marginLeft: 8 }}>Reset</button>
      </div>
    </div>
  );
}
