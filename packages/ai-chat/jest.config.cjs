module.exports = {
  preset: "ts-jest/presets/default-esm",
  testEnvironment: "jsdom",
  roots: ["<rootDir>/tests"],
  testMatch: ["**/spec/**/*_spec.ts", "**/spec/**/*_spec.tsx"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "mjs"],
  transform: {
    "^.+\\.(ts|tsx)$": ["ts-jest", {
      useESM: true,
      tsconfig: {
        module: "esnext",
        target: "es2022",
        lib: ["es2022", "dom", "dom.iterable"],
        moduleResolution: "node",
        jsx: "react-jsx"
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
    "^(\\.\\.?/.+)\\.js$": "$1",
    "\\.(css|less|scss|sass)$": "<rootDir>/tests/transforms/cssTransform.cjs",
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(?:@lit|lit|lit-html|lit-element|@carbon|lodash-es|@floating-ui|uuid|csv-stringify|compute-scroll-into-view|@ibm|classnames|tabbable|react-player|swiper|dayjs|dompurify|focus-trap-react|intl-messageformat|markdown-it|@formatjs|@codemirror|@lezer|crelt|style-mod|w3c-keyname|flatpickr)/).*\\.js$'
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
