# Ask Mode Rules (Non-Obvious Only)

## Monorepo Package Structure

**Two main packages with different purposes**:

- `@carbon/ai-chat`: Full chat application (React + web components)
- `@carbon/ai-chat-components`: Reusable components library only

## Component Organization Context

**Three component directories with different purposes**:

- `packages/ai-chat/src/chat/components-legacy/` - Legacy code marked for refactoring (don't reference as examples)
- `packages/ai-chat/src/chat/ai-chat-components/` - Pending migration to @carbon/ai-chat-components
- `packages/ai-chat/src/chat/components/` - Internal chat app components (not reusable)

## Test File Organization

**Non-standard test locations**:

- `@carbon/ai-chat`: Tests in `tests/spec/` directory (NOT co-located with source files)
- `@carbon/ai-chat-components`: Tests co-located with source as `*.test.ts`

## Store Implementation

**Custom Redux-like store**: `packages/ai-chat/src/chat/store/` implements custom hooks that look like Redux but are NOT from react-redux. This is intentional to avoid peer dependencies.

## Shadow DOM Architecture

**React in custom element**: The React app runs inside `cds-aichat-react` custom element with shadow DOM for style isolation. User-defined responses use slotted content.

## Build System

**Lerna monorepo**: Uses Lerna with independent versioning. Build commands target specific packages for faster builds (`npm run aiChat:build` vs `npm run build`).
