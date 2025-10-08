module.exports = {
  roots: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  transform: {
    "^.+\\.(ts|tsx)$": ["babel-jest", { configFile: "./babel.config.js" }],
    "^.+\\.(js|jsx)$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?|jsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    "^@carbon/ai-chat$":
      "<rootDir>/../../../packages/ai-chat/dist/es/aiChatEntry.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(@carbon|lit-html|lit-element|lit|@lit|@lit-labs|lodash-es)/)",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/../../../node_modules", "src"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
