module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/spec/**/*_spec.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        module: "esnext",
        target: "es2022",
        lib: ["es2022", "dom", "dom.iterable"],
        moduleResolution: "node",
      }
    }],
    "^.+\\.(js|jsx|mjs)$": ["babel-jest", {
      presets: [
        ["@babel/preset-env", { 
          targets: { node: "current" },
          modules: "commonjs"
        }],
        "@babel/preset-react"
      ],
    }],
    "^.+\\.(css|scss)$": ["<rootDir>/tests/transforms/cssTransform.cjs"],
  },
  moduleNameMapper: {
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/transforms/cssTransform.cjs",
    "^../../../codeElement/cds-aichat-code$": "<rootDir>/src/chat/web-components/components/codeElement/cds-aichat-code.ts",
    "^../../../table/cds-aichat-table$": "<rootDir>/src/chat/web-components/components/table/cds-aichat-table.ts",
  },
  transformIgnorePatterns: [
    "node_modules/(?!(@lit|lit|lit-html|lit-element|@carbon|lodash-es|@floating-ui|uuid|csv-stringify|compute-scroll-into-view|@ibm|classnames|tabbable|react-player|swiper|dayjs|dompurify|focus-trap-react|highlight.js|intl-messageformat|intl-pluralrules|markdown-it|react-intl)/)",
  ],
  setupFilesAfterEnv: ["<rootDir>/tests/setup.ts"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  testTimeout: 10000,
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
};