# Advance Mode Rules (Non-Obvious Only)

## Custom Store Implementation

**Custom Redux-style hooks**: `packages/ai-chat/src/chat/store/` implements custom `useSelector` and `useDispatch` hooks that mimic Redux but are NOT from react-redux. Import from local hooks directory, not external packages.

## Shadow DOM Architecture

**React in Shadow DOM**: The React app runs inside `cds-aichat-react` custom element with shadow DOM. User-defined responses and writable elements MUST use slotted content to maintain styling isolation outside shadow boundary.

## Component Organization

**Don't add to legacy**: `packages/ai-chat/src/chat/components-legacy/` is marked for refactoring. Add new components to:

- `@carbon/ai-chat-components` package for reusable components
- `packages/ai-chat/src/chat/components/` for chat-app-specific components only

**Pending migration**: Components in `packages/ai-chat/src/chat/ai-chat-components/` should eventually move to `@carbon/ai-chat-components` package.

## Test File Locations

**Non-standard test locations**:

- `@carbon/ai-chat`: Tests go in `tests/spec/**/*_spec.ts(x)` (NOT co-located with source)
- `@carbon/ai-chat-components`: Tests co-located as `*.test.ts` in same directory as source

## Import Requirements

**ESM .js extensions required**: TypeScript imports MUST use `.js` extensions even for `.ts` files (ESM requirement). Example: `import { foo } from './bar.js'` not `'./bar'`. Jest maps these back via `moduleNameMapper`.

## Jest ESM Handling

**transformIgnorePatterns**: Jest config has extensive list of ESM-only packages that must be transformed: lit, @carbon packages, lodash-es, @floating-ui, uuid, csv-stringify, compute-scroll-into-view, @ibm, classnames, tabbable, swiper, dayjs, dompurify, focus-trap-react, intl-messageformat, markdown-it, @formatjs, @codemirror, @lezer, crelt, style-mod, w3c-keyname, flatpickr. Add new ESM deps here.

## TypeScript Strictness

**Relaxed strict checks**: `strictNullChecks: false` and `strictFunctionTypes: false` in tsconfig. Don't assume strict null checking when adding types.
