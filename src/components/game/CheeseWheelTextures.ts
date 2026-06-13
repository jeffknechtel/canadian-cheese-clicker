import * as THREE from 'three';
import type { CheeseTextureType } from '../../data/constants';

const TEXTURE_COLORS: Record<CheeseTextureType, { base: string; rind: string }> = {
  basic: { base: '#F5DEB3', rind: '#D4A853' },
  aged: { base: '#FDEBD0', rind: '#B8860B' },
  mature: { base: '#F5CBA7', rind: '#8B4513' },
  vintage: { base: '#E8B86D', rind: '#654321' },
  artisan: { base: '#DAA520', rind: '#4A3728' },
  legendary: { base: '#FFD700', rind: '#2F1810' },
};

const textureCache = new Map<CheeseTextureType, THREE.Texture>();

export function createCheeseTexture(type: CheeseTextureType): THREE.Texture {
  const cached = textureCache.get(type);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  const colors = TEXTURE_COLORS[type];

  ctx.fillStyle = colors.base;
  ctx.fillRect(0, 0, 256, 256);

  // Add subtle noise for texture
  for (let i = 0; i < 500; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const size = Math.random() * 3 + 1;
    ctx.fillStyle = `rgba(0,0,0,${Math.random() * 0.05})`;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  // Rind edge gradient
  const gradient = ctx.createRadialGradient(128, 128, 100, 128, 128, 128);
  gradient.addColorStop(0, 'transparent');
  gradient.addColorStop(1, colors.rind + '40');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  textureCache.set(type, texture);
  return texture;
}
