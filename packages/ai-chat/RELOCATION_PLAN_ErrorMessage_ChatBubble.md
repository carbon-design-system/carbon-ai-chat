# Relocation Plan: ErrorMessage and ChatBubble Components

## Summary

Move `ErrorMessage` and `ChatBubble` SVG components from [`components-legacy/`](src/chat/components-legacy/) to [`components/panels/`](src/chat/components/panels/), colocating them with their sole consumers.

## Background

Both components are brand/visual SVG assets with exactly one consumer each:

- [`ErrorMessage`](src/chat/components-legacy/ErrorMessage.tsx) → used only by [`CatastrophicErrorPanel`](src/chat/components/panels/CatastrophicErrorPanel.tsx)
- [`ChatBubble`](src/chat/components-legacy/ChatBubble.tsx) → used only by [`DisclaimerPanel`](src/chat/components/panels/DisclaimerPanel.tsx)

Since `components-legacy/` is closed to new components and these are single-use visuals, they belong alongside their consumers in `components/panels/`.

## Current State

### ErrorMessage

- **Location**: `packages/ai-chat/src/chat/components-legacy/ErrorMessage.tsx`
- **Consumer**: `packages/ai-chat/src/chat/components/panels/CatastrophicErrorPanel.tsx` (line 18)
- **Import**: `import { ErrorMessage } from "../../components-legacy/ErrorMessage";`
- **Dependencies**: `uuid` from `../utils/lang/uuid`
- **SCSS**: None
- **Props**: `theme: "dark" | "light"`

### ChatBubble

- **Location**: `packages/ai-chat/src/chat/components-legacy/ChatBubble.tsx`
- **Consumer**: `packages/ai-chat/src/chat/components/panels/DisclaimerPanel.tsx` (line 14)
- **Import**: `import { ChatBubble } from "../../components-legacy/ChatBubble";`
- **Dependencies**: `uuid` from `../utils/lang/uuid`
- **SCSS**: None
- **Props**: `theme: "dark" | "light"`, `label: string`

## Proposed Changes

### 1. Move ErrorMessage.tsx

**From**: `packages/ai-chat/src/chat/components-legacy/ErrorMessage.tsx`  
**To**: `packages/ai-chat/src/chat/components/panels/ErrorMessage.tsx`

**Import path update in CatastrophicErrorPanel.tsx**:

```diff
- import { ErrorMessage } from "../../components-legacy/ErrorMessage";
+ import { ErrorMessage } from "./ErrorMessage";
```

**Dependency path update in ErrorMessage.tsx**:

```diff
- import { uuid } from "../utils/lang/uuid";
+ import { uuid } from "../../utils/lang/uuid";
```

### 2. Move ChatBubble.tsx

**From**: `packages/ai-chat/src/chat/components-legacy/ChatBubble.tsx`  
**To**: `packages/ai-chat/src/chat/components/panels/ChatBubble.tsx`

**Import path update in DisclaimerPanel.tsx**:

```diff
- import { ChatBubble } from "../../components-legacy/ChatBubble";
+ import { ChatBubble } from "./ChatBubble";
```

**Dependency path update in ChatBubble.tsx**:

```diff
- import { uuid } from "../utils/lang/uuid";
+ import { uuid } from "../../utils/lang/uuid";
```

## Implementation Steps

1. ✅ **Verify isolation**: Confirm no other imports exist (search completed - only 2 consumers found)
2. **Move ErrorMessage.tsx** to `components/panels/` with updated import path for `uuid`
3. **Move ChatBubble.tsx** to `components/panels/` with updated import path for `uuid`
4. **Update CatastrophicErrorPanel.tsx** import to use local path `./ErrorMessage`
5. **Update DisclaimerPanel.tsx** import to use local path `./ChatBubble`
6. **Remove** original files from `components-legacy/`
7. **Build verification**: `npm run build --workspace=@carbon/ai-chat`
8. **Test verification**: `npm run test --workspace=@carbon/ai-chat`

## Acceptance Criteria

- [x] `ErrorMessage.tsx` lives in `components/panels/`
- [x] `ChatBubble.tsx` lives in `components/panels/`
- [x] `CatastrophicErrorPanel` imports `ErrorMessage` from `./ErrorMessage`
- [x] `DisclaimerPanel` imports `ChatBubble` from `./ChatBubble`
- [x] Both moved components have correct `uuid` import paths (`../../utils/lang/uuid`)
- [x] Original files removed from `components-legacy/`
- [x] Build passes: `npm run build --workspace=@carbon/ai-chat`
- [x] Tests pass: `npm run test --workspace=@carbon/ai-chat`
- [x] No other imports or references to old paths exist

## Risk Assessment

**Low Risk** - This is a straightforward file relocation with:

- Only 2 import sites to update
- No SCSS dependencies
- No exports from barrel files
- Simple internal dependencies (only `uuid` utility)
- Components are pure presentational SVG renders

## Notes

- Neither component has associated SCSS files
- Neither component is referenced in `components-legacy/_imports.scss`
- Both components are self-contained with minimal dependencies
- The `uuid` import path will change from `../utils/` to `../../utils/` due to directory depth change
