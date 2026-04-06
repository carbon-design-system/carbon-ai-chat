# AGENTS.md

This file provides guidance to agents when working with code in this repository.

## Build & Test Commands

**Monorepo structure**: Uses Lerna with independent versioning. Main packages are `@carbon/ai-chat` and `@carbon/ai-chat-components`.

**Build specific packages**:

```bash
# Build AI Chat packages only (faster than full build)
npm run aiChat:build

# Build all packages
npm run build
```

**Test commands**:

```bash
# Run all tests across packages
npm run test

# Test specific package
npm run test --workspace=@carbon/ai-chat
npm run test --workspace=@carbon/ai-chat-components

# ai-chat uses Jest with tests in tests/spec/**/*_spec.ts(x)
# ai-chat-components uses @web/test-runner with tests in src/components/**/*.test.ts
```

**Development**:

```bash
# Start demo with watch mode
npm run aiChat:start

# Start Storybook for web components
npm run aiChat:start:storybook

# Start Storybook for React components
npm run aiChat:start:storybook:react
```

## Non-Obvious Patterns

**Custom Redux-style store**: `packages/ai-chat/src/chat/store/` implements a minimal Redux-like store WITHOUT external redux/react-redux dependencies. Uses `useSelector` and `useDispatch` hooks but they're custom implementations, not from react-redux.

**Shadow DOM architecture**: React app runs inside a custom element (`cds-aichat-react`) with shadow DOM. User-defined responses and writable elements use slotted content to maintain styling isolation.

**Component organization quirks**:

- `packages/ai-chat/src/chat/components-legacy/` - Legacy components marked for refactoring (don't add new ones here)
- `packages/ai-chat/src/chat/ai-chat-components/` - Should be moved to @carbon/ai-chat-components package
- `packages/ai-chat/src/chat/components/` - Internal chat app components (not reusable)

**Test file locations**:

- `@carbon/ai-chat`: Tests in `tests/spec/` directory (NOT co-located with source)
- `@carbon/ai-chat-components`: Tests co-located with source files as `*.test.ts`

**Jest ESM configuration**: Uses `ts-jest` with ESM preset. Extensive `transformIgnorePatterns` to handle ESM-only dependencies like lit, @carbon packages, lodash-es, etc.

**TypeScript config**: `strictNullChecks: false` and `strictFunctionTypes: false` - be aware when adding strict type checks.

## Code Style

**Imports**: Use `.js` extensions in TypeScript imports (ESM requirement). Jest config maps these back via `moduleNameMapper`.

**Commit conventions**: Uses conventional commits with commitlint. Header max 72 chars, body max 90 chars per line.

**Linting**: Uses `eslint-config-carbon`. Test files have `@typescript-eslint/no-non-null-assertion` disabled.

**Styling**:

- Stylelint with `stylelint-config-carbon`
- Keyframe names must be kebab-case
- Animation durations in `ms` only
- Custom element selectors starting with `cds-` are allowed

**License headers**: All source files require Apache-2.0 license headers. Check with `npm run lint:license`.
