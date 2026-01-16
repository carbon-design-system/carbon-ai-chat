module.exports = {
  roots: ["<rootDir>/src"],
  testEnvironment: "jsdom",
  transform: {
    // Route TS/JS through babel-jest so CommonJS Jest can understand our ESM build.
    "^.+\\.(ts|tsx)$": ["babel-jest", { configFile: "./babel.config.js" }],
    "^.+\\.(js|jsx|mjs)$": ["babel-jest", { configFile: "./babel.config.js" }],
  },
  testRegex: "(/__tests__/.*|(\\.|/)(test|spec))\\.(tsx?|jsx?)$",
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
  moduleNameMapper: {
    // Resolve @carbon/ai-chat imports to the local dist build for deterministic snapshots.
    "^@carbon/ai-chat$":
      "<rootDir>/../../../packages/ai-chat/dist/es/aiChatEntry.js",
    "^@carbon/ai-chat/server$":
      "<rootDir>/../../../packages/ai-chat/dist/es/serverEntry.js",
  },
  setupFilesAfterEnv: ["<rootDir>/src/jest.setup.ts"],
  transformIgnorePatterns: [
    // Allowlist ESM-only dependencies so Babel transpiles them when running under Jest.
    "node_modules/(?!(?:@lit|lit|lit-html|lit-element|@lit-labs|@carbon|lodash-es|@floating-ui|uuid|csv-stringify|compute-scroll-into-view|@ibm|classnames|tabbable|react-player|swiper|dayjs|dompurify|focus-trap-react|intl-messageformat|markdown-it|react-intl|@formatjs|@codemirror|@lezer|crelt|style-mod|w3c-keyname|flatpickr)/)",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/../../../node_modules", "src"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
