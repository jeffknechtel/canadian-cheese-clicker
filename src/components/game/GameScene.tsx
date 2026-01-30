import { useMemo, useState, useEffect, useCallback, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import { CheeseWheel } from './CheeseWheel';
import { ClickEffects } from './ClickEffects';
import { useSettingsStore } from '../../stores/settingsStore';
import { useGameStore } from '../../stores/gameStore';
import { isMobile } from '../../systems/gameLoop';
import { playClickSound, resumeAudioContext } from '../../systems/audioSystem';
import { announce } from '../../systems/accessibilityAnnouncer';

// Defer non-critical scene elements for faster initial load
const DEFER_DETAILS_MS = 100;

// Mobile optimization: reduce tree count and geometry complexity
const TREE_COUNT_DESKTOP = 30;
const TREE_COUNT_MOBILE = 12;
const CYLINDER_SEGMENTS_DESKTOP = 32;
const CYLINDER_SEGMENTS_MOBILE = 16;

// Canadian landscape backdrop with gradient sky and mountain silhouettes
// Memoized to prevent re-renders when parent re-renders
const CanadianBackdrop = memo(function CanadianBackdrop() {
  // Defer loading of detailed elements for faster initial render
  const [showDetails, setShowDetails] = useState(false);
  const quality = useSettingsStore((state) => state.graphics.quality);

  // Determine tree count based on quality and device
  const treeCount = useMemo(() => {
    const baseCount = isMobile() ? TREE_COUNT_MOBILE : TREE_COUNT_DESKTOP;
    switch (quality) {
      case 'low':
        return Math.ceil(baseCount * 0.25);
      case 'medium':
        return Math.ceil(baseCount * 0.5);
      case 'high':
        return Math.ceil(baseCount * 0.75);
      case 'ultra':
      default:
        return baseCount;
    }
  }, [quality]);

  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(true), DEFER_DETAILS_MS);
    return () => clearTimeout(timer);
  }, []);

  // Create gradient texture for sky (Canadian colors - subtle red/white/blue)
  const gradientTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    // Gradient from top (deep blue) to bottom (warm cream/golden for horizon)
    const gradient = ctx.createLinearGradient(0, 0, 0, 256);
    gradient.addColorStop(0, '#1e3a5f'); // Deep Canadian blue
    gradient.addColorStop(0.3, '#4a7c9b'); // Medium blue
    gradient.addColorStop(0.6, '#89b4c8'); // Light blue
    gradient.addColorStop(0.8, '#f5e6d3'); // Cream (Tim Hortons inspired)
    gradient.addColorStop(0.9, '#fcd34d'); // Golden horizon (cheddar)
    gradient.addColorStop(1, '#c9a875'); // Timber ground

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 2, 256);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }, []);

  // Mountain silhouette geometry
  const mountainGeometry = useMemo(() => {
    const shape = new THREE.Shape();

    // Create jagged mountain silhouette (Rocky Mountains style)
    shape.moveTo(-25, -5);
    shape.lineTo(-20, 2);
    shape.lineTo(-18, 0);
    shape.lineTo(-15, 4);
    shape.lineTo(-12, 1);
    shape.lineTo(-8, 6); // Peak
    shape.lineTo(-5, 2);
    shape.lineTo(-2, 3);
    shape.lineTo(0, 7); // Highest peak
    shape.lineTo(3, 4);
    shape.lineTo(6, 5);
    shape.lineTo(10, 2);
    shape.lineTo(13, 4);
    shape.lineTo(16, 1);
    shape.lineTo(18, 3);
    shape.lineTo(20, 0);
    shape.lineTo(22, 2);
    shape.lineTo(25, -5);
    shape.lineTo(-25, -5);

    return new THREE.ShapeGeometry(shape);
  }, []);

  // Pine tree silhouettes (simple triangles)
  const treeGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(-0.3, -0.8);
    shape.lineTo(0.3, -0.8);
    shape.closePath();
    return new THREE.ShapeGeometry(shape);
  }, []);

  // Pre-computed tree positions and scales (deterministic for pure render)
  // Uses quality-adjusted tree count for performance
  const treeData = useMemo(() => {
    // Pre-computed positions using a simple seeded pattern
    const data: { position: [number, number, number]; scale: [number, number, number] }[] = [];
    for (let i = 0; i < treeCount; i++) {
      // Use deterministic pseudo-random based on index
      const seed1 = Math.sin(i * 12.9898) * 43758.5453;
      const seed2 = Math.sin(i * 78.233) * 43758.5453;
      const seed3 = Math.sin(i * 37.719) * 43758.5453;
      const seed4 = Math.sin(i * 93.989) * 43758.5453;
      const seed5 = Math.sin(i * 56.127) * 43758.5453;

      const r1 = seed1 - Math.floor(seed1);
      const r2 = seed2 - Math.floor(seed2);
      const r3 = seed3 - Math.floor(seed3);
      const r4 = seed4 - Math.floor(seed4);
      const r5 = seed5 - Math.floor(seed5);

      const x = (r1 - 0.5) * 40;
      const y = -3.5 + r2 * 0.5;
      const z = -12 - r3 * 3;
      const scaleX = 1 + r4 * 0.5;
      const scaleY = 1.5 + r5;

      data.push({
        position: [x, y, z],
        scale: [scaleX, scaleY, 1],
      });
    }
    return data;
  }, [treeCount]);

  return (
    <group>
      {/* Sky backdrop plane - large enough to cover restricted camera angles */}
      <mesh position={[0, 2, -20]} rotation={[0, 0, 0]}>
        <planeGeometry args={[200, 50]} />
        <meshBasicMaterial map={gradientTexture} side={THREE.DoubleSide} />
      </mesh>

      {/* Mountain silhouette - back layer (darker) */}
      <mesh position={[0, -2, -15]} geometry={mountainGeometry}>
        <meshBasicMaterial color="#2d3748" transparent opacity={0.6} />
      </mesh>

      {/* Mountain silhouette - front layer (slightly lighter) */}
      <mesh position={[5, -3, -12]} scale={[0.8, 0.6, 1]} geometry={mountainGeometry}>
        <meshBasicMaterial color="#4a5568" transparent opacity={0.8} />
      </mesh>

      {/* Pine tree silhouettes - deferred for faster initial load */}
      {showDetails && treeData.map((tree, i) => (
        <mesh
          key={i}
          position={tree.position}
          geometry={treeGeometry}
          scale={tree.scale}
        >
          <meshBasicMaterial color="#1a202c" transparent opacity={0.7} />
        </mesh>
      ))}

      {/* Ground plane - extended to match sky coverage */}
      <mesh position={[0, -4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[200, 80]} />
        <meshStandardMaterial color="#8b7355" roughness={1} />
      </mesh>

      {/* Northern Lights effect (subtle aurora) - deferred */}
      {showDetails && (
        <mesh position={[0, 8, -18]}>
          <planeGeometry args={[40, 8]} />
          <meshBasicMaterial
            color="#4ade80"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
          />
        </mesh>
      )}
    </group>
  );
});

// Get cylinder segments based on device
function getCylinderSegments(): number {
  return isMobile() ? CYLINDER_SEGMENTS_MOBILE : CYLINDER_SEGMENTS_DESKTOP;
}

export function GameScene() {
  const cylinderSegments = useMemo(() => getCylinderSegments(), []);
  const quality = useSettingsStore((state) => state.graphics.quality);
  const click = useGameStore((state) => state.click);

  // Adjust pixel ratio based on quality setting for better mobile performance
  const dpr = useMemo(() => {
    const devicePixelRatio = window.devicePixelRatio || 1;
    const isMobileDevice = isMobile();

    switch (quality) {
      case 'low':
        return Math.min(1, devicePixelRatio);
      case 'medium':
        return Math.min(isMobileDevice ? 1.5 : 2, devicePixelRatio);
      case 'high':
        return Math.min(2, devicePixelRatio);
      case 'ultra':
      default:
        return devicePixelRatio;
    }
  }, [quality]);

  // Handle keyboard click on cheese wheel
  const handleKeyboardClick = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        resumeAudioContext();
        click();
        playClickSound();
        announce('Clicked cheese wheel', 'polite');
      }
    },
    [click]
  );

  return (
    <div className="relative w-full h-full">
      {/* Accessible button overlay for keyboard interaction with cheese wheel */}
      <button
        onClick={() => {
          resumeAudioContext();
          click();
          playClickSound();
          announce('Clicked cheese wheel', 'polite');
        }}
        onKeyDown={handleKeyboardClick}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                   w-32 h-32 rounded-full opacity-0 focus:opacity-100 focus:ring-4
                   focus:ring-cheddar-400 focus:ring-opacity-50 focus:bg-cheddar-500/10
                   transition-opacity cursor-pointer"
        aria-label="Click the cheese wheel to earn curds. Press Space or Enter to click."
        title="Cheese Wheel - Click or press Space/Enter"
      >
        <span className="sr-only">Click cheese wheel</span>
      </button>
      <Canvas
        camera={{ position: [0, 2, 4], fov: 50 }}
        dpr={dpr}
        performance={{ min: 0.5 }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight position={[5, 5, 5]} intensity={1} castShadow />
        <directionalLight position={[-3, 3, -3]} intensity={0.3} />
        <CanadianBackdrop />
        <CheeseWheel cylinderSegments={cylinderSegments} />
        <OrbitControls
          enableZoom={false}
          enablePan={false}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2.2}
          minAzimuthAngle={-Math.PI / 4}
          maxAzimuthAngle={Math.PI / 4}
        />
      </Canvas>
      <ClickEffects />
    </div>
  );
}
