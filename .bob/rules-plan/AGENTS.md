# Plan Mode Rules (Non-Obvious Only)

## Architecture Constraints

**Shadow DOM isolation**: React app runs inside `cds-aichat-react` custom element with shadow DOM. This architectural decision means:

- User-defined responses MUST use slotted content (not direct DOM manipulation)
- Styling isolation is enforced at the shadow boundary
- Custom elements maintain their own styling outside the shadow DOM

## State Management Architecture

**Custom Redux-like store without Redux**: `packages/ai-chat/src/chat/store/` implements a minimal Redux-style store WITHOUT external redux/react-redux dependencies. This is an intentional architectural decision to:

- Remove peer dependencies
- Reduce bundle size
- Maintain Redux-like patterns developers expect

## Component Migration Strategy

**Three-tier component organization**:

1. `packages/ai-chat/src/chat/components-legacy/` - Legacy code being phased out (don't add here)
2. `packages/ai-chat/src/chat/ai-chat-components/` - Pending migration to separate package
3. `packages/ai-chat/src/chat/components/` - Internal chat app components only

**Reusable components**: Should go in `@carbon/ai-chat-components` package, not in ai-chat package.

## Testing Architecture

**Split testing strategies**:

- `@carbon/ai-chat`: Jest with tests in separate `tests/spec/` directory
- `@carbon/ai-chat-components`: @web/test-runner with co-located tests

This split reflects different testing needs: full app integration vs component unit tests.

## Build System

**Monorepo with targeted builds**: Lerna with independent versioning allows building specific packages (`npm run aiChat:build`) instead of entire monorepo, significantly reducing build times during development.

## TypeScript Configuration

**Relaxed strictness**: `strictNullChecks: false` and `strictFunctionTypes: false` are intentional architectural decisions. Plan for gradual migration to strict mode, not immediate enforcement.
