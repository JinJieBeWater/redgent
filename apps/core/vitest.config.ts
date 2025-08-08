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
      '@redgent/db/client': path.resolve(
        __dirname,
        '../../packages/database/src',
      ),
      '@redgent/shared': path.resolve(__dirname, '../../packages/shared/src'),
      test: path.resolve(__dirname, './test'),
    },
  },
  plugins: [swc.vite()],
})
