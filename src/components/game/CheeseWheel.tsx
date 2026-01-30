import { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores/gameStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { playClickSound, resumeAudioContext } from '../../systems/audioSystem';
import { isMobile } from '../../systems/gameLoop';

interface CheeseWheelProps {
  onClickPosition?: (point: THREE.Vector3) => void;
  cylinderSegments?: number;
}

// Frame throttling configuration
// Desktop: full 60fps, Mobile: 30fps for better battery
const DESKTOP_FRAME_INTERVAL = 1; // Every frame
const MOBILE_FRAME_INTERVAL = 2; // Every other frame

export function CheeseWheel({ onClickPosition, cylinderSegments = 32 }: CheeseWheelProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clickAnimation, setClickAnimation] = useState(0);
  const click = useGameStore((state) => state.click);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  // Frame counter for throttling on mobile
  const frameCounter = useRef(0);
  const frameInterval = useMemo(() => (isMobile() ? MOBILE_FRAME_INTERVAL : DESKTOP_FRAME_INTERVAL), []);

  // Accumulated delta for mobile (maintains smooth animation timing)
  const accumulatedDelta = useRef(0);

  // Handle click animation with frame throttling
  useFrame((_, delta) => {
    if (!meshRef.current) return;

    frameCounter.current++;
    accumulatedDelta.current += delta;

    // Throttle frame updates on mobile for better performance
    if (frameCounter.current % frameInterval !== 0) {
      return;
    }

    // Use accumulated delta for smooth animation regardless of frame throttling
    const effectiveDelta = accumulatedDelta.current;
    accumulatedDelta.current = 0;

    // Wobble animation on click (skip if reduced motion)
    if (clickAnimation > 0 && !reducedMotion) {
      const wobble = Math.sin(clickAnimation * 20) * 0.1 * clickAnimation;
      meshRef.current.rotation.z = wobble;
      meshRef.current.scale.setScalar(1 + clickAnimation * 0.1);
      setClickAnimation((prev) => Math.max(0, prev - effectiveDelta * 3));
    } else {
      meshRef.current.rotation.z = 0;
      meshRef.current.scale.setScalar(hovered && !reducedMotion ? 1.05 : 1);
    }

    // Slow rotation (continuous, not affected by reduced motion for visual interest)
    meshRef.current.rotation.y += effectiveDelta * 0.2;
  });

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();

      // Resume audio context on first interaction
      resumeAudioContext();

      click();
      playClickSound();
      setClickAnimation(1);

      // Pass click position for particle effects
      if (onClickPosition && event.point) {
        onClickPosition(event.point.clone());
      }
    },
    [click, onClickPosition]
  );

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
      rotation={[-Math.PI / 2, 0, 0]}
    >
      {/* Main cheese wheel - segments adjusted for performance on mobile */}
      <cylinderGeometry args={[1.2, 1.2, 0.4, cylinderSegments]} />
      <meshStandardMaterial
        color={hovered ? '#fbbf24' : '#f59e0b'}
        roughness={0.6}
        metalness={0.1}
      />
    </mesh>
  );
}
