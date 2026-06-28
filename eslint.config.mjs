import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': 'warn',
      'no-console': 'off',
    },
  },
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'next.config.js',
      'postcss.config.js',
    ],
  },
)
