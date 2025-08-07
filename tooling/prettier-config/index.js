/** @typedef {import("prettier").Config} PrettierConfig */
/** @typedef {import("prettier-plugin-tailwindcss").PluginOptions} TailwindConfig */
/** @typedef {import("@ianvs/prettier-plugin-sort-imports").PluginConfig} SortImportsConfig */

/** @type { PrettierConfig | SortImportsConfig | TailwindConfig } */
const config = {
  plugins: [
    '@ianvs/prettier-plugin-sort-imports',
    'prettier-plugin-tailwindcss',
  ],
  // Tailwind CSS 相关配置
  tailwindFunctions: ['cn', 'cva', 'clsx', 'tw'],

  // 导入排序配置
  importOrder: [
    '<TYPES>',
    '^(react/(.*)$)|^(react$)|^(react-dom(.*)$)',
    '^(next/(.*)$)|^(next$)',
    '^(vite/(.*)$)|^(vite$)',
    '^(@tanstack/(.*)$)',
    '^(@radix-ui/(.*)$)',
    '<THIRD_PARTY_MODULES>',
    '',
    '<TYPES>^@redgent',
    '^@redgent/(.*)$',
    '',
    '<TYPES>^@/',
    '^@/(.*)$',
    '',
    '<TYPES>^[.|..|~]',
    '^~/',
    '^[../]',
    '^[./]',
  ],
  importOrderParserPlugins: ['typescript', 'jsx', 'decorators-legacy'],
  importOrderTypeScriptVersion: '5.0.0',

  // 格式化规则
  singleQuote: true,
  trailingComma: 'all',
  endOfLine: 'auto',
  semi: false,
  tabWidth: 2,
  useTabs: false,
  printWidth: 80,
  bracketSpacing: true,
  bracketSameLine: false,
  arrowParens: 'avoid',

  // 文件特殊处理
  overrides: [
    {
      files: '*.json.hbs',
      options: {
        parser: 'json',
      },
    },
    {
      files: '*.js.hbs',
      options: {
        parser: 'babel',
      },
    },
    {
      files: '*.md',
      options: {
        printWidth: 100,
        proseWrap: 'preserve',
      },
    },
    {
      files: '*.{ts,tsx,js,jsx}',
      options: {
        parser: 'typescript',
      },
    },
  ],
}

export default config
