import { useMemo } from 'react';
import * as THREE from 'three';

interface CheeseWedgeProps {
  index: number;
  total: number;
  radius: number;
  depth: number;
}

export function CheeseWedge({ index, total, radius, depth }: CheeseWedgeProps) {
  const geometry = useMemo(() => {
    const angle = Math.PI / 6;
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(radius * Math.cos(-angle / 2), radius * Math.sin(-angle / 2));
    shape.absarc(0, 0, radius, -angle / 2, angle / 2, false);
    shape.lineTo(0, 0);

    const extrudeSettings = { depth, bevelEnabled: false };
    return new THREE.ExtrudeGeometry(shape, extrudeSettings);
  }, [radius, depth]);

  const rotation = (index / Math.max(total, 1)) * Math.PI * 2;
  const offset = 0.25;

  return (
    <mesh
      geometry={geometry}
      position={[Math.cos(rotation) * offset, -depth / 2, Math.sin(rotation) * offset]}
      rotation={[Math.PI / 2, rotation + Math.PI / 2, 0]}
    >
      <meshStandardMaterial color="#FDEBD0" roughness={0.6} />
    </mesh>
  );
}
