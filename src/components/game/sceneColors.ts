/**
 * Scene colors for the Three.js/canvas layer, which cannot read CSS variables.
 * Values cross-reference the design tokens in src/index.css where one exists —
 * keep them in sync if a token changes.
 */
export const SCENE_COLORS = {
  // Sky gradient stops (top → horizon → ground)
  skyDeepBlue: '#1e3a5f',
  skyMediumBlue: '#4a7c9b',
  skyLightBlue: '#89b4c8',
  skyCream: '#f5e6d3', // = --color-timmys-cream
  skyGoldenHorizon: '#fcd34d', // = --color-cheddar-300
  skyTimberGround: '#c9a875', // = --color-timber-300
  // Silhouettes
  mountainBack: '#2d3748',
  mountainFront: '#4a5568',
  pineTree: '#1a202c',
  // Terrain and effects
  ground: '#8b7355', // = --color-rind
  aurora: '#4ade80',
} as const;
