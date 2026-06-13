import { useMemo } from 'react';

interface CheeseHolesProps {
  count: number;
  radius: number;
  depth: number;
}

export function CheeseHoles({ count, radius, depth }: CheeseHolesProps) {
  const holes = useMemo(() => {
    const positions: { pos: [number, number, number]; size: number; rotation: number }[] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + (i * 0.7) % 0.5;
      const r = radius * 0.3 + ((i * 17) % 100) / 100 * radius * 0.4;
      const x = Math.cos(angle) * r;
      const z = Math.sin(angle) * r;
      const y = (((i * 31) % 100) / 100 - 0.5) * depth * 0.8;
      const size = 0.08 + ((i * 23) % 100) / 100 * 0.04;
      const rotation = ((i * 41) % 100) / 100 * Math.PI;
      positions.push({ pos: [x, y, z], size, rotation });
    }
    return positions;
  }, [count, radius, depth]);

  if (count === 0) return null;

  return (
    <>
      {holes.map((hole, i) => (
        <mesh key={i} position={hole.pos} rotation={[0, 0, hole.rotation]}>
          <sphereGeometry args={[hole.size, 8, 8]} />
          <meshStandardMaterial color="#2A1F1A" transparent opacity={0.9} />
        </mesh>
      ))}
    </>
  );
}
