module.exports = {
  roots: ["<rootDir>/src/react"],
  testEnvironment: "@happy-dom/jest-environment",
  transform: {
    "^.+\\.(ts|tsx)$": ["babel-jest", { configFile: "./babel.config.jest.cjs" }],
    "^.+\\.(js|jsx|mjs)$": ["babel-jest", { configFile: "./babel.config.jest.cjs" }],
  },
  testRegex: "/__tests__/.*\\.test\\.(tsx?|jsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    // Map .js imports to .ts/.tsx files for TypeScript source files
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  setupFilesAfterEnv: ["<rootDir>/src/react/__tests__/jest.setup.ts"],
  transformIgnorePatterns: [
    "node_modules/(?!(?:@lit|lit|lit-html|lit-element|@lit-labs|@carbon|lodash-es|@floating-ui|uuid|csv-stringify|compute-scroll-into-view|@ibm|classnames|tabbable|react-player|swiper|dayjs|dompurify|focus-trap-react|intl-messageformat|markdown-it|@codemirror|@lezer|crelt|style-mod|w3c-keyname)/)",
  ],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};

// Made with Bob
