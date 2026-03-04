import nextConfig from 'eslint-config-next'

export default [
  ...nextConfig,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
]
