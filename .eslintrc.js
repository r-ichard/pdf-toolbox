module.exports = {
  root: true,
  env: {
    browser: true,
    es2021: true,
    node: true
  },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended'
  ],
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaFeatures: {
      jsx: true
    },
    ecmaVersion: 'latest',
    sourceType: 'module'
  },
  plugins: [
    '@typescript-eslint',
    'react',
    'react-hooks',
    'react-refresh',
    'jsx-a11y'
  ],
  settings: {
    react: {
      version: 'detect'
    }
  },
  ignorePatterns: [
    'dist/**/*',
    'node_modules/**/*',
    'coverage/**/*',
    'playwright-report/**/*',
    'test-results/**/*',
    'e2e/**/*',
    '*.config.js',
    '*.config.ts',
    'scripts/**/*'
  ],
  rules: {
    // TypeScript Rules (relaxed)
    '@typescript-eslint/no-unused-vars': [
      'warn',
      {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true
      }
    ],
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/prefer-const': 'off',
    '@typescript-eslint/no-var-requires': 'warn',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/consistent-type-imports': 'off',

    // React Rules
    'react/react-in-jsx-scope': 'off', // Not needed with new JSX transform
    'react/prop-types': 'off', // Using TypeScript for prop validation
    'react/display-name': 'warn',
    'react/no-unescaped-entities': 'off', // Allow unescaped entities
    'react/jsx-key': 'error',
    'react/jsx-no-duplicate-props': 'error',
    'react/jsx-no-undef': 'error',
    'react/jsx-uses-vars': 'error',
    'react/no-deprecated': 'warn',
    'react/no-direct-mutation-state': 'error',
    'react/no-unknown-property': 'error',
    'react/self-closing-comp': 'warn',
    'react/jsx-boolean-value': ['warn', 'never'],
    'react/jsx-curly-brace-presence': ['warn', { props: 'never', children: 'never' }],

    // React Hooks Rules
    'react-hooks/rules-of-hooks': 'error',
    'react-hooks/exhaustive-deps': 'warn',

    // React Refresh Rules (for development)
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true }
    ],

    // Accessibility Rules (a11y) - relaxed
    'jsx-a11y/click-events-have-key-events': 'off',
    'jsx-a11y/no-static-element-interactions': 'off',
    'jsx-a11y/label-has-associated-control': 'off',
    'jsx-a11y/alt-text': 'warn',
    'jsx-a11y/aria-props': 'warn',
    'jsx-a11y/aria-proptypes': 'warn',
    'jsx-a11y/aria-unsupported-elements': 'warn',
    'jsx-a11y/role-has-required-aria-props': 'warn',
    'jsx-a11y/role-supports-aria-props': 'warn',

    // Import-like Rules (simplified)
    // 'no-duplicate-imports': handled below

    // General Code Quality (relaxed for setup)
    'no-console': 'off', // Allow console for development
    'no-debugger': 'warn',
    'no-alert': 'off', // Allow alerts for now
    'no-unused-vars': 'off', // Using TypeScript version
    'no-undef': 'off', // TypeScript handles this
    'prefer-const': 'warn',
    'no-var': 'error',
    'object-shorthand': 'off',
    'prefer-arrow-callback': 'off',
    'prefer-template': 'off',
    'template-curly-spacing': 'off',
    'no-trailing-spaces': 'off',
    'no-multiple-empty-lines': 'off',
    'comma-dangle': 'off',
    'semi': 'off',
    'quotes': 'off',
    'jsx-quotes': 'off',
    'no-control-regex': 'off',
    'no-case-declarations': 'off', // Allow case declarations
    'no-duplicate-imports': 'off', // Allow duplicate imports for now

    // Performance
    'no-await-in-loop': 'off',
    'require-atomic-updates': 'off'
  },
  overrides: [
    {
      // Specific rules for test files
      files: ['**/*.test.{js,jsx,ts,tsx}', '**/*.spec.{js,jsx,ts,tsx}', '**/test/**/*', '**/tests/**/*'],
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-explicit-any': 'off',
        '@typescript-eslint/no-non-null-assertion': 'off',
        'react-refresh/only-export-components': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    },
    {
      // Specific rules for config files
      files: ['*.config.{js,ts}', '**/*.config.{js,ts}'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/no-unused-vars': 'off'
      }
    },
    {
      // Specific rules for script files
      files: ['scripts/**/*'],
      env: {
        node: true
      },
      rules: {
        'no-console': 'off',
        '@typescript-eslint/no-var-requires': 'off'
      }
    }
  ]
};