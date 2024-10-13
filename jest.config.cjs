module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  moduleFileExtensions: ['ts', 'js'],
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      useESM: true, // Move useESM config here
    }],
  },
  extensionsToTreatAsEsm: ['.ts'],
  testMatch: ['**/?(*.)+(test).ts'],
};
