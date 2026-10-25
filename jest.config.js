module.exports = {
  rootDir: '.',
  testRegex: 'test/.*\\.spec\\.ts$',
  moduleFileExtensions: ['ts', 'js', 'json'],
  transform: { '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.spec.json', diagnostics: false }] },
  testEnvironment: 'node',
  setupFiles: ['<rootDir>/test/setup.ts'],
};
