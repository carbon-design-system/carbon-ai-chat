module.exports = {
  roots: ["<rootDir>/src"],
  testEnvironment: "@happy-dom/jest-environment",
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
    "node_modules/(?!(?:@lit|lit|lit-html|lit-element|@lit-labs|@carbon|lodash-es|@floating-ui|uuid|csv-stringify|compute-scroll-into-view|@ibm|classnames|tabbable|react-player|swiper|dayjs|dompurify|focus-trap-react|intl-messageformat|markdown-it|react-intl|@codemirror|@lezer|crelt|style-mod|w3c-keyname)/)",
  ],
  moduleDirectories: ["node_modules", "<rootDir>/../../../node_modules", "src"],
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,
};
