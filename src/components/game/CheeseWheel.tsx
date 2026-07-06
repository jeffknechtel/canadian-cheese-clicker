import { useRef, useState, useCallback, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import { playClickSound, resumeAudioContext } from '../../systems/audioSystem';
import { isMobile } from '../../systems/gameLoop';
import { vibrateClick } from '../../systems/haptics';
import { markClickProcessed } from '../../hooks/useFreezeDetector';
import { CHEESE_WHEEL_TIERS, type CheeseWheelTier } from '../../data/constants';
import { createCheeseTexture } from './CheeseWheelTextures';
import { CheeseHoles } from './CheeseHoles';
import { CheeseWedge } from './CheeseWedge';

interface CheeseWheelProps {
  onClickPosition?: (point: THREE.Vector3) => void;
  cylinderSegments?: number;
}

const DESKTOP_FRAME_INTERVAL = 1;
const MOBILE_FRAME_INTERVAL = 2;

export function CheeseWheel({ onClickPosition, cylinderSegments = 32 }: CheeseWheelProps) {
  const groupRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [clickAnimation, setClickAnimation] = useState(0);
  const click = useGameStore((state) => state.click);
  const totalCurdsEarned = useGameStore((state) => state.totalCurdsEarned);
  const reducedMotion = useSettingsStore((state) => state.accessibility.reducedMotion);

  const frameCounter = useRef(0);
  const frameInterval = useMemo(() => (isMobile() ? MOBILE_FRAME_INTERVAL : DESKTOP_FRAME_INTERVAL), []);
  const accumulatedDelta = useRef(0);

  const tier = useMemo(() => {
    let current: CheeseWheelTier = CHEESE_WHEEL_TIERS[0];
    for (const t of CHEESE_WHEEL_TIERS) {
      if (totalCurdsEarned.gte(t.threshold)) {
        current = t;
      }
    }
    return current;
  }, [totalCurdsEarned]);

  const texture = useMemo(() => createCheeseTexture(tier.texture), [tier.texture]);

  useFrame((state, delta) => {
    if (!groupRef.current || !meshRef.current) return;

    frameCounter.current++;
    accumulatedDelta.current += delta;

    if (frameCounter.current % frameInterval !== 0) {
      return;
    }

    const effectiveDelta = accumulatedDelta.current;
    accumulatedDelta.current = 0;

    if (clickAnimation > 0 && !reducedMotion) {
      const wobble = Math.sin(clickAnimation * 20) * 0.1 * clickAnimation;
      groupRef.current.rotation.z = wobble;
      groupRef.current.scale.setScalar(1 + clickAnimation * 0.1);
      setClickAnimation((prev) => Math.max(0, prev - effectiveDelta * 3));
    } else {
      groupRef.current.rotation.z = 0;
      groupRef.current.scale.setScalar(hovered && !reducedMotion ? 1.05 : 1);
    }

    meshRef.current.rotation.y += effectiveDelta * 0.2;

    // Gentle bob for high tiers
    if (tier.glow) {
      groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.03;
    }
  });

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      markClickProcessed(); // Track for freeze detection
      resumeAudioContext();
      click();
      playClickSound();
      vibrateClick();
      setClickAnimation(1);

      if (onClickPosition && event.point) {
        onClickPosition(event.point.clone());
      }
    },
    [click, onClickPosition]
  );

  return (
    <group ref={groupRef} rotation={[-Math.PI / 2, 0, 0]}>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[1.2, 1.2, 0.4, cylinderSegments]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={tier.glow ? 0.3 : 0.1}
          emissive={tier.glow ? '#FFD700' : '#000000'}
          emissiveIntensity={tier.glow ? 0.2 : 0}
        />
      </mesh>

      <CheeseHoles count={tier.holes} radius={1.2} depth={0.4} />

      {Array.from({ length: tier.wedges }).map((_, i) => (
        <CheeseWedge key={i} index={i} total={tier.wedges} radius={1.3} depth={0.08} />
      ))}

      {tier.glow && <pointLight position={[0, 0.5, 0]} intensity={0.5} color="#FFD700" distance={3} />}
    </group>
  );
}
