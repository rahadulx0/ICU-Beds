const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    testTimeout: 30000,
    hookTimeout: 30000,
    setupFiles: ['./tests/setup.js'],
    include: ['tests/**/*.test.js'],
    pool: 'forks',
    poolOptions: {
      forks: { singleFork: true },
    },
  },
});
