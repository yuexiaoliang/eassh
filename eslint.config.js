// @ts-check
import antfu from '@antfu/eslint-config'

export default antfu(
  {
    type: 'lib',
    pnpm: true,
    rules: {
      'no-console': 'off',
      'node/prefer-global/process': 'off',
      'unused-imports/no-unused-vars': 'off',
      'pnpm/json-enforce-catalog': 'off',
      'yaml/sort-keys': 'off',
      'pnpm/yaml-no-unused-catalog-item': 'off',
      'pnpm/yaml-no-duplicate-catalog-item': 'off',
    },
  },
)
