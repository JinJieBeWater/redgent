import path, { resolve } from 'path'
import swc from 'unplugin-swc'
import tsconfigPaths from 'vite-tsconfig-paths'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    setupFiles: ['./test/setup.ts'],

    globals: true,
    root: './',
    include: [
      // './test/**/*.e2e-spec.ts',
      // './integration/**/*.integration-spec.ts',
      './src/**/*.spec.ts',
    ],
    // setupFiles: [resolve(__dirname, 'test/setup-file.ts')],
    environment: 'node',
    includeSource: [
      // resolve(__dirname, './test'),
      // resolve(__dirname, './integration'),
    ],
    alias: {
      '@core': path.resolve(__dirname, './src'),
      '@redgent/db': path.resolve(__dirname, '../../packages/database/src'),
      '@redgent/shared': path.resolve(__dirname, '../../packages/shared/src'),
    },
  },
  plugins: [
    tsconfigPaths(),
    // This is required to build the test files with SWC
    swc.vite({
      // Explicitly set the module type to avoid inheriting this value from a `.swcrc` config file
      module: {
        type: 'nodenext',
      },
    }),
  ],
  resolve: {
    alias: {
      '@core': path.resolve(__dirname, './src'),
    },
  },
})
