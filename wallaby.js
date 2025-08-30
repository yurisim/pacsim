module.exports = function (wallaby) {
  return {
    autoDetect: true,
    tests: ['apps/**/*spec.ts', 'libs/**/*spec.ts', '!**/*-e2e/**/*.spec.ts'],
    // tests: ['apps/**/*spec.ts', 'libs/**/*spec.ts'],
  };
};
