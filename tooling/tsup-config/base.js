/**
 * A shared TSUP configuration for the repository.
 *
 * @type {import('tsup').Options}
 */
export const config = {
  entry: ['src/index.ts'],
  format: ['cjs', 'esm'],
  dts: true,
  sourcemap: true,
  dts: {
    compilerOptions: {
      composite: false,
    },
  },
}
