module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: 'module',
    project: './tsconfig.json',
  },
  plugins: ['@typescript-eslint'],
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
  ],
  env: {
    node: true,
    es2020: true,
  },
  rules: {
    // Disable overly strict rules for this project
    '@typescript-eslint/no-explicit-any': 'off',
    '@typescript-eslint/no-unsafe-assignment': 'off',
    '@typescript-eslint/no-unsafe-member-access': 'off',
    '@typescript-eslint/no-unsafe-call': 'off',
    '@typescript-eslint/no-unsafe-return': 'off',
    '@typescript-eslint/no-unsafe-argument': 'off',
    '@typescript-eslint/restrict-template-expressions': 'off',
    '@typescript-eslint/restrict-plus-operands': 'off',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/no-floating-promises': 'off',
    '@typescript-eslint/await-thenable': 'off',
    '@typescript-eslint/require-await': 'off',
    '@typescript-eslint/unbound-method': 'off',
    '@typescript-eslint/no-unnecessary-type-assertion': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': 'off',
    '@typescript-eslint/prefer-optional-chain': 'off',
    '@typescript-eslint/prefer-as-const': 'off',
    
    // Keep important rules as warnings
    '@typescript-eslint/no-unused-vars': ['warn', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_',
      caughtErrorsIgnorePattern: '^_'
    }],
    '@typescript-eslint/no-empty-function': 'off',
    '@typescript-eslint/no-non-null-assertion': 'off',
    '@typescript-eslint/ban-ts-comment': 'off',
    '@typescript-eslint/no-empty-interface': 'off',
    '@typescript-eslint/no-inferrable-types': 'off',
    '@typescript-eslint/no-namespace': 'off',
    
    // Keep basic ESLint rules
    'no-console': 'off',
    'no-unused-vars': 'off', // Use TypeScript version instead
    'no-empty': 'off',
    'no-case-declarations': 'off',
    'no-fallthrough': 'off',
    'no-constant-condition': 'off',
    'no-useless-escape': 'off',
    'no-var': 'error',
    'prefer-const': 'warn',
    
    // Disable formatting rules (should be handled by prettier)
    'quotes': 'off',
    'semi': 'off',
    'indent': 'off',
    'max-len': 'off',
    'object-curly-spacing': 'off',
    'array-bracket-spacing': 'off',
    'space-before-function-paren': 'off',
    'comma-dangle': 'off',
    'brace-style': 'off',
    'eqeqeq': 'off',
    'curly': 'off',
  },
  ignorePatterns: [
    'dist/',
    'dist-cjs/',
    'node_modules/',
    'coverage/',
    'bin/',
    '*.js', // Ignore compiled JS files
    '*.d.ts',
    '.vscode/',
    '.npm/',
    '.cache/',
    'examples/',
    'tests/',
    'scripts/',
    'src/templates/',
    'src/ui/console/',
    'src/ui/web-ui/',
  ],
  overrides: [
    {
      files: ['*.js'],
      rules: {
        '@typescript-eslint/no-var-requires': 'off',
        '@typescript-eslint/explicit-function-return-type': 'off',
      },
    },
  ],
};