# Relocation Plan for responseTypes Components (Issue #1436)

## Summary

Relocate 4 components from `components-legacy/responseTypes/` to `components/`, flatten `BodyWithFooterComponent` into `CardItemComponent`, and delete dead code (`TranscriptComponent`).

---

## Proposed Feature-Folder Structure

Create a new `components/messages/` directory to house message-type components:

```
packages/ai-chat/src/chat/components/
├── messages/                          # NEW: Message response type components
│   ├── AudioComponent.tsx
│   ├── VideoComponent.tsx
│   ├── CardItemComponent.tsx
│   ├── CardItemComponent.scss
│   ├── CarouselItemComponent.tsx
│   └── _imports.scss
```

**Rationale:** These are all message response-type components that render specific message formats. Grouping them together makes their purpose clear and follows the existing pattern of feature-based folders (`aria/`, `carbon/`, `header/`, `homeScreen/`, `modals/`, `panels/`, `util/`).

---

## Detailed Relocation Mapping

| Component                 | Current Path                                                         | New Path                                        | Notes                                       |
| ------------------------- | -------------------------------------------------------------------- | ----------------------------------------------- | ------------------------------------------- |
| `AudioComponent`          | `components-legacy/responseTypes/audio/AudioComponent.tsx`           | `components/messages/AudioComponent.tsx`        | Depends on `MediaPlayer` (issue #1440)      |
| `VideoComponent`          | `components-legacy/responseTypes/video/VideoComponent.tsx`           | `components/messages/VideoComponent.tsx`        | Depends on `MediaPlayer` (issue #1440)      |
| `CardItemComponent`       | `components-legacy/responseTypes/card/CardItemComponent.tsx`         | `components/messages/CardItemComponent.tsx`     | Flatten `BodyWithFooterComponent` into this |
| `CardItemComponent.scss`  | `components-legacy/responseTypes/card/CardItemComponent.scss`        | `components/messages/CardItemComponent.scss`    | Moves with component                        |
| `CarouselItemComponent`   | `components-legacy/responseTypes/carousel/CarouselItemComponent.tsx` | `components/messages/CarouselItemComponent.tsx` | Container component                         |
| `BodyWithFooterComponent` | `components-legacy/BodyWithFooterComponent.tsx`                      | **FLATTEN INTO** `CardItemComponent.tsx`        | Don't relocate as separate file             |
| `TranscriptComponent`     | `components-legacy/responseTypes/util/TranscriptComponent.tsx`       | **DELETE**                                      | Dead code, no importers                     |

---

## SCSS Relocation Strategy

### 1. `maxWidth.scss` → Global SCSS

**Current:** `components-legacy/responseTypes/maxWidth.scss`  
**New:** `packages/ai-chat/src/globals/scss/_max-width-utilities.scss`

**Reason:** Defines shared utility classes (`.cds-aichat--max-width-{small,medium,large}`) used by both `CardItemComponent` (this issue) and `GridItemComponent` (still in legacy). Must be global until `GridItemComponent` is also relocated.

**Action:**

- Create `packages/ai-chat/src/globals/scss/_max-width-utilities.scss`
- Copy content from `maxWidth.scss`
- Import in `packages/ai-chat/src/globals/scss/_chat-theme.scss`
- Update `CardItemComponent` to import from global location
- **Do NOT delete** `maxWidth.scss` yet (GridItemComponent still needs it)

### 2. `Carousel.scss` - Coordinate with Deferred Trunk

**Current:** `components-legacy/responseTypes/carousel/Carousel.scss`  
**Issue:** Styles the `carousel` element rendered by `MessageTypeComponent` (deferred trunk), NOT `CarouselItemComponent`

**Action:**

- **Do NOT move** with `CarouselItemComponent`
- Leave in place for now
- Add comment: `// TODO: Relocate with MessageTypeComponent carousel rendering (deferred trunk effort)`
- Coordinate with team on final destination

### 3. `carousel/_imports.scss` - Preserve Live Rule

**Current:** `components-legacy/responseTypes/carousel/_imports.scss`  
**Contains:** Live rule `.carousel-container { max-inline-size: … }`

**Action:**

- Extract the live rule before deleting folder
- Add to `Carousel.scss` or appropriate location
- **Do NOT** treat as pure aggregator

### 4. `card/_imports.scss`

**Current:** `components-legacy/responseTypes/card/_imports.scss`  
**New:** `components/messages/_imports.scss`

**Action:**

- Create new `_imports.scss` in `components/messages/`
- Import `CardItemComponent.scss`
- Update parent `components/_imports.scss` to include `messages/_imports`

---

## Import Sites to Update

### Primary Importer: `MessageTypeComponent.tsx`

**File:** `components-legacy/MessageTypeComponent.tsx`  
**Lines:** 37, 39, 41, 52

**Current imports:**

```typescript
import { AudioComponent } from "./responseTypes/audio/AudioComponent";
import { CardItemComponent } from "./responseTypes/card/CardItemComponent";
import { CarouselItemComponent } from "./responseTypes/carousel/CarouselItemComponent";
import { VideoComponent } from "./responseTypes/video/VideoComponent";
```

**New imports:**

```typescript
import { AudioComponent } from "../components/messages/AudioComponent";
import { CardItemComponent } from "../components/messages/CardItemComponent";
import { CarouselItemComponent } from "../components/messages/CarouselItemComponent";
import { VideoComponent } from "../components/messages/VideoComponent";
```

### Secondary Importer: `CarouselItemComponent.tsx`

**File:** `components-legacy/responseTypes/carousel/CarouselItemComponent.tsx`  
**Line:** 18

**Current import:**

```typescript
import { CardItemComponent } from "../card/CardItemComponent";
```

**New import (after relocation):**

```typescript
import { CardItemComponent } from "./CardItemComponent";
```

### Tertiary Importer: `MediaPlayer.tsx`

**File:** `components-legacy/responseTypes/util/MediaPlayer.tsx`  
**Line:** 17

**Current import:**

```typescript
import { VideoComponentConfig } from "../video/VideoComponent";
```

**New import (after relocation):**

```typescript
import { VideoComponentConfig } from "../../messages/VideoComponent";
```

---

## BodyWithFooterComponent Flattening Plan

### Current Structure

`CardItemComponent` imports and renders `BodyWithFooterComponent`:

```typescript
// CardItemComponent.tsx
import { BodyWithFooterComponent } from "../../BodyWithFooterComponent";

// Inside render:
<BodyWithFooterComponent
  localMessageItem={props.localMessageItem}
  fullMessage={props.fullMessage}
  isMessageForInput={props.isMessageForInput}
  requestFocus={props.requestFocus}
  renderMessageComponent={props.renderMessageComponent}
/>
```

### Flattening Steps

1. **Copy logic from `BodyWithFooterComponent` into `CardItemComponent`:**
   - Move `useServiceManager()` hook
   - Move `useSelector(selectInputIsReadonly)` hook
   - Inline the body/footer rendering logic

2. **Update imports in `CardItemComponent`:**
   - Add: `import { useServiceManager } from "../../hooks/useServiceManager";`
   - Add: `import { useSelector } from "../../hooks/useSelector";`
   - Add: `import { selectInputIsReadonly } from "../../store/selectors";`
   - Remove: `import { BodyWithFooterComponent } from "../../BodyWithFooterComponent";`

3. **Add dependencies from issue #1439:**
   - `BodyWithFooterComponent` uses `BodyMessageComponents` and `FooterButtonComponents`
   - These are being relocated by issue #1439
   - Update imports to point to their new locations once #1439 completes

4. **Delete `BodyWithFooterComponent.tsx`** after flattening is complete

---

## Step-by-Step Execution Plan

### Phase 1: Preparation & SCSS

1. ✅ Verify `TranscriptComponent` has no importers (CONFIRMED)
2. Create `packages/ai-chat/src/globals/scss/_max-width-utilities.scss`
3. Copy content from `responseTypes/maxWidth.scss` to new global file
4. Import `_max-width-utilities.scss` in `_chat-theme.scss`
5. Add TODO comment to `Carousel.scss` about deferred trunk coordination
6. Extract live rule from `carousel/_imports.scss` and preserve it

### Phase 2: Component Relocation (Dependency Order)

7. Create `components/messages/` directory
8. **Move `AudioComponent.tsx`** (simplest, no internal deps)
   - Update import in `MessageTypeComponent.tsx`
   - Verify build passes
9. **Move `VideoComponent.tsx`** (simple, no internal deps)
   - Update import in `MessageTypeComponent.tsx`
   - Update import in `MediaPlayer.tsx`
   - Verify build passes
10. **Move `CardItemComponent.tsx` + `.scss`** (depends on BodyWithFooter)
    - Update import in `MessageTypeComponent.tsx`
    - Update SCSS import to use global `_max-width-utilities`
    - Verify build passes
11. **Move `CarouselItemComponent.tsx`** (depends on CardItem)
    - Update import in `MessageTypeComponent.tsx`
    - Update internal import of `CardItemComponent`
    - Verify build passes

### Phase 3: Flattening & Cleanup

12. **Flatten `BodyWithFooterComponent` into `CardItemComponent`:**
    - Copy hooks and logic
    - Update imports (coordinate with #1439 for BodyMessageComponents/FooterButtonComponents)
    - Test thoroughly
    - Delete `BodyWithFooterComponent.tsx`
13. **Delete `TranscriptComponent.tsx`**
14. Create `components/messages/_imports.scss`
15. Update `components/_imports.scss` to include `messages/_imports`
16. Remove empty `responseTypes/audio/`, `responseTypes/video/`, `responseTypes/card/` directories
17. **Leave** `responseTypes/carousel/` folder (contains `Carousel.scss` for deferred trunk)

### Phase 4: Verification

18. Run `npm run build --workspace=@carbon/ai-chat`
19. Run `npm run test --workspace=@carbon/ai-chat`
20. Run `npm run lint --workspace=@carbon/ai-chat`
21. Visual smoke test in demo app

---

## Coordination with Sibling Issues

### Issue #1439: BodyMessageComponents & FooterButtonComponents

**Impact:** `BodyWithFooterComponent` (being flattened into `CardItemComponent`) imports these

**Coordination:**

- Wait for #1439 to complete before flattening `BodyWithFooterComponent`
- OR: Update imports in flattened code to point to new locations from #1439
- Imports needed:
  ```typescript
  import { BodyMessageComponents } from "./responseTypes/util/BodyMessageComponents";
  import { FooterButtonComponents } from "./responseTypes/util/FooterButtonComponents";
  ```

### Issue #1440: MediaPlayer & Error Helpers

**Impact:** `AudioComponent` and `VideoComponent` import `MediaPlayer`

**Coordination:**

- Can relocate Audio/Video components before #1440
- Update imports when #1440 completes
- Current import:
  ```typescript
  import { MediaPlayer } from "../util/MediaPlayer";
  ```

---

## Open Questions & Decisions Needed

1. **Feature folder name:** Confirm `components/messages/` is acceptable, or prefer `components/responseTypes/`?
2. **Carousel.scss ownership:** Who owns the deferred trunk effort? When will `MessageTypeComponent` carousel rendering be refactored?
3. **maxWidth.scss timing:** When can we delete the legacy `maxWidth.scss` (after `GridItemComponent` relocation)?
4. **Execution order:** Should we wait for #1439 and #1440 to complete first, or proceed in parallel with coordination?

---

## Acceptance Criteria Checklist

- [ ] `AudioComponent.tsx` relocated to `components/messages/`
- [ ] `VideoComponent.tsx` relocated to `components/messages/`
- [ ] `CardItemComponent.tsx` + `.scss` relocated to `components/messages/`
- [ ] `CarouselItemComponent.tsx` relocated to `components/messages/`
- [ ] `BodyWithFooterComponent` flattened into `CardItemComponent` (not relocated as separate file)
- [ ] `TranscriptComponent.tsx` deleted (confirmed dead code)
- [ ] `maxWidth.scss` relocated to `globals/scss/_max-width-utilities.scss`
- [ ] `Carousel.scss` left in place with TODO comment
- [ ] Live rule from `carousel/_imports.scss` preserved
- [ ] All import sites updated (`MessageTypeComponent`, `CarouselItemComponent`, `MediaPlayer`)
- [ ] Empty legacy directories removed (except `carousel/`)
- [ ] `components/messages/_imports.scss` created
- [ ] Build passes: `npm run build --workspace=@carbon/ai-chat`
- [ ] Tests pass: `npm run test --workspace=@carbon/ai-chat`
- [ ] Lint passes: `npm run lint --workspace=@carbon/ai-chat`
- [ ] Visual smoke test in demo app confirms no regressions
