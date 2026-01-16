module.exports = {
  roots: ["<rootDir>/src"],
  testEnvironment: "@happy-dom/jest-environment",
  transform: {
    // Use the local babel config for TS/JS/JSX so the suite works even in CommonJS Jest.
    "^.+\\.(ts|tsx)$": ["babel-jest", { configFile: "./babel.config.js" }],
    "^.+\\.(js|jsx|mjs)$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  // Only pick up *.test files so helper modules sitting next to tests are ignored.
  testRegex: "/__tests__/.*\\.test\\.(tsx?|jsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    // Point imports at the workspace build output so tests exercise the real bundle.
    // You likely won't need to do this since you won't be running in our workspace setup.
    "^@carbon/ai-chat$":
      "<rootDir>/../../../packages/ai-chat/dist/es/aiChatEntry.js",
    "^@carbon/ai-chat/server$":
      "<rootDir>/../../../packages/ai-chat/dist/es/serverEntry.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
  transformIgnorePatterns: [
    // Allowlist the ESM dependencies that need transpilation under Jest's CJS runtime.
    "node_modules/(?!(?:@lit|lit|lit-html|lit-element|@lit-labs|@carbon|lodash-es|@floating-ui|uuid|csv-stringify|compute-scroll-into-view|@ibm|classnames|tabbable|react-player|swiper|dayjs|dompurify|focus-trap-react|intl-messageformat|markdown-it|@formatjs|@codemirror|@lezer|crelt|style-mod|w3c-keyname|flatpickr)/)",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/../../../node_modules", "src"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
