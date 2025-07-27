import { defineConfig } from 'tsup'

import { config } from '@redgent/tsup-config/base'

/** @type {import("tsup").Options} */
export default defineConfig({
  ...config,
  dts: false,
})
