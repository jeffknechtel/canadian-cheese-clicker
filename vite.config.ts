import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Target modern browsers for smaller bundles
    target: 'es2020',
    // Use esbuild for minification (fast and efficient)
    minify: 'esbuild',
    // Enable CSS minification
    cssMinify: true,
    rollupOptions: {
      output: {
        // Manual chunks for optimal code splitting
        manualChunks(id) {
          // Three.js and 3D libraries are heavy - bundle separately
          if (id.includes('node_modules/three') || id.includes('node_modules/@react-three')) {
            return 'three-vendor';
          }
          // Math library for big numbers
          if (id.includes('node_modules/decimal.js')) {
            return 'decimal-vendor';
          }
          // State management
          if (id.includes('node_modules/zustand')) {
            return 'zustand-vendor';
          }
          // Game data files - loaded after initial render
          if (id.includes('/src/data/heroes') ||
              id.includes('/src/data/enemies') ||
              id.includes('/src/data/zones') ||
              id.includes('/src/data/equipment') ||
              id.includes('/src/data/cheeseRecipes') ||
              id.includes('/src/data/caves') ||
              id.includes('/src/data/events')) {
            return 'game-data';
          }
        },
      },
    },
    // Generate source maps for debugging in production (optional)
    sourcemap: false,
    // Chunk size warning limit (default is 500kb)
    chunkSizeWarningLimit: 600,
  },
  // Optimize dependencies during dev
  optimizeDeps: {
    include: ['react', 'react-dom', 'three', '@react-three/fiber', '@react-three/drei', 'zustand', 'decimal.js'],
  },
});
