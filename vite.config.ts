import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

// Use a relative base so the built site can be hosted on GitHub Pages,
// Netlify, Vercel, or opened from any static web server without changes.
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
