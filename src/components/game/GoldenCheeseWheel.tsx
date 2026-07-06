import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFrame, type ThreeEvent } from '@react-three/fiber';
import * as THREE from 'three';
import { useGameStore } from '../../stores';
import { useSettingsStore } from '../../stores/settingsStore';
import {
  playGoldenCheeseAppear,
  playGoldenCheeseCollect,
  resumeAudioContext,
} from '../../systems/audioSystem';
import { vibrateSuccess } from '../../systems/haptics';
import { emitParticles } from '../../systems/particleSystem';
import { isMobile } from '../../systems/gameLoop';

const APPEAR_ANIMATION_MS = 300;
const EXPIRE_WARNING_MS = 3000;

const DESKTOP_FRAME_INTERVAL = 1;
const MOBILE_FRAME_INTERVAL = 2;

export function GoldenCheeseWheel() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.MeshStandardMaterial>(null);
  const [hovered, setHovered] = useState(false);
  const [appearProgress, setAppearProgress] = useState(0);

  const collectGoldenCheese = useGameStore((s) => s.collectGoldenCheese);
  const expiresAt = useGameStore((s) => s.goldenCheese.expiresAt);
  const reducedMotion = useSettingsStore((s) => s.accessibility.reducedMotion);

  const frameCounter = useRef(0);
  const frameInterval = useMemo(() => (isMobile() ? MOBILE_FRAME_INTERVAL : DESKTOP_FRAME_INTERVAL), []);
  const accumulatedDelta = useRef(0);
  const lastSparkleTime = useRef(0);

  // Play appear sound when mounted
  useEffect(() => {
    resumeAudioContext();
    playGoldenCheeseAppear();
  }, []);

  // Animate appearance
  useFrame((state, delta) => {
    if (!meshRef.current || !materialRef.current) return;

    frameCounter.current++;
    accumulatedDelta.current += delta;

    if (frameCounter.current % frameInterval !== 0) {
      return;
    }

    const effectiveDelta = accumulatedDelta.current;
    accumulatedDelta.current = 0;

    const now = Date.now();
    const timeUntilExpire = expiresAt - now;
    const isExpiring = timeUntilExpire <= EXPIRE_WARNING_MS && timeUntilExpire > 0;

    // Update appear animation
    if (appearProgress < 1) {
      setAppearProgress((prev) => Math.min(1, prev + effectiveDelta * (1000 / APPEAR_ANIMATION_MS)));
    }

    if (reducedMotion) {
      meshRef.current.scale.setScalar(hovered ? 0.75 : 0.7);
      return;
    }

    // Calculate animation time
    const time = state.clock.elapsedTime;

    // Rotation - faster than main cheese
    meshRef.current.rotation.y += effectiveDelta * 0.8;

    // Vertical bob
    const bobSpeed = isExpiring ? 4 : 2;
    meshRef.current.position.y = 1.5 + Math.sin(time * bobSpeed) * 0.15;

    // Pulsing emissive glow
    const pulseSpeed = isExpiring ? 8 : 3;
    const emissiveIntensity = 0.3 + Math.sin(time * pulseSpeed) * 0.2;
    materialRef.current.emissiveIntensity = emissiveIntensity;

    // Fade out during expiry warning
    if (isExpiring) {
      const fadeProgress = 1 - timeUntilExpire / EXPIRE_WARNING_MS;
      materialRef.current.opacity = 1 - fadeProgress * 0.7;
    } else {
      materialRef.current.opacity = 1;
    }

    // Scale animation
    const baseScale = 0.7 * appearProgress;
    const hoverScale = hovered ? 1.15 : 1;
    meshRef.current.scale.setScalar(baseScale * hoverScale);

    // Emit ambient sparkles periodically
    if (now - lastSparkleTime.current > 800 && meshRef.current.parent) {
      lastSparkleTime.current = now;
      const worldPos = new THREE.Vector3();
      meshRef.current.getWorldPosition(worldPos);
      emitParticles(
        window.innerWidth / 2 + worldPos.x * 50,
        window.innerHeight / 2 - worldPos.y * 50,
        'goldenSparkles'
      );
    }
  });

  const handleClick = useCallback(
    (event: ThreeEvent<MouseEvent>) => {
      event.stopPropagation();
      resumeAudioContext();

      const result = collectGoldenCheese();
      if (result) {
        playGoldenCheeseCollect();
        vibrateSuccess();

        // Emit particles at click location
        const screenX = event.clientX ?? window.innerWidth / 2;
        const screenY = event.clientY ?? window.innerHeight / 2;
        emitParticles(screenX, screenY, 'goldenSparkles');
        setTimeout(() => emitParticles(screenX, screenY, 'confetti'), 100);
      }
    },
    [collectGoldenCheese]
  );

  return (
    <mesh
      ref={meshRef}
      onClick={handleClick}
      onPointerOver={() => {
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'default';
      }}
      position={[2.5, 1.5, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={0}
    >
      <cylinderGeometry args={[0.7, 0.7, 0.25, 24]} />
      <meshStandardMaterial
        ref={materialRef}
        color="#ffd700"
        emissive="#ffa500"
        emissiveIntensity={0.3}
        metalness={0.8}
        roughness={0.2}
        transparent
        opacity={1}
      />
    </mesh>
  );
}
