module.exports = [
  {
    ignores: ['node_modules/**', 'src/public/uploads/**'],
  },
  {
    files: ['**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { Buffer: 'readonly', console: 'readonly', module: 'readonly', process: 'readonly', require: 'readonly' },
    },
  },
];
