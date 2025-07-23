import { reactJsConfig } from '@redgent/eslint-config/react-js'

export default [
  ...reactJsConfig,
  {
    ignores: ['dist', 'node_modules', 'routeTree.gen.ts', 'vite.config.ts'],
  },
]
