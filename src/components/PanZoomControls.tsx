import { useRef, useCallback } from 'react';
import { useThree, useFrame } from '@react-three/fiber';

export function PanZoomControls({
  minZoom = 1,
  maxZoom = 6,
  initialZoom = 1,
  initialOffset = { x: 0, y: 0 },
  children,
}: {
  minZoom?: number;
  maxZoom?: number;
  initialZoom?: number;
  initialOffset?: { x: number; y: number };
  children?: React.ReactNode;
}) {
  const { camera, size } = useThree();
  const dragging = useRef(false);
  const lastWorldPos = useRef<{ x: number; y: number } | null>(null);
  const zoom = useRef(initialZoom);
  const offset = useRef(initialOffset);

  // Convert screen (pixel) coordinates to world coordinates
  const screenToWorld = useCallback((clientX: number, clientY: number) => {
    const ndcX = (clientX / size.width) * 2 - 1;
    const ndcY = -((clientY / size.height) * 2 - 1);
    // For orthographic camera
    const worldX = camera.position.x + ndcX * (camera.right - camera.left) / 2;
    const worldY = camera.position.y + ndcY * (camera.top - camera.bottom) / 2;
    return { x: worldX, y: worldY };
  }, [camera, size]);

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    lastWorldPos.current = screenToWorld(e.clientX, e.clientY);
  }, [screenToWorld]);

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current || !lastWorldPos.current) return;
    const currWorldPos = screenToWorld(e.clientX, e.clientY);
    const dx = currWorldPos.x - lastWorldPos.current.x;
    const dy = currWorldPos.y - lastWorldPos.current.y;
    offset.current = { x: offset.current.x - dx, y: offset.current.y - dy };
    lastWorldPos.current = currWorldPos;
  }, [screenToWorld]);

  const onPointerUp = useCallback(() => {
    dragging.current = false;
    lastWorldPos.current = null;
  }, []);

  const onWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    zoom.current = Math.max(minZoom, Math.min(maxZoom, zoom.current * Math.exp(-e.deltaY * 0.001)));
  }, [minZoom, maxZoom]);

  useFrame(() => {
    const aspect = size.width / size.height;
    const camHeight = 4000 / zoom.current;
    const camWidth = camHeight * aspect;
    camera.left = -camWidth / 2 + offset.current.x;
    camera.right = camWidth / 2 + offset.current.x;
    camera.top = camHeight / 2 + offset.current.y;
    camera.bottom = -camHeight / 2 + offset.current.y;
    camera.position.set(4000 / 2, 4000 / 2, 1000);
    camera.up.set(0, 1, 0);
    camera.lookAt(4000 / 2, 4000 / 2, 0);
    camera.updateProjectionMatrix();
  });

  return (
    <group>
      <mesh
        visible={false}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerLeave={onPointerUp}
        onWheel={onWheel}
      />
      {children}
    </group>
  );
}
