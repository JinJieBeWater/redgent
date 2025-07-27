import path from 'path'
import swc from 'unplugin-swc'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],

    globals: true,
    root: './',
    include: ['**/*.spec.ts'],
    alias: {
      '@core': path.resolve(__dirname, './src'),
      '@redgent/db': path.resolve(__dirname, '../../packages/database/src'),
      '@redgent/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  plugins: [swc.vite()],
})
