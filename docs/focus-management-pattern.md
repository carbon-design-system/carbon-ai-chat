# Generic Focus Management Pattern for Web Components

## Overview

This document describes a reusable pattern for implementing focus management in web components. The pattern allows parent components (like `@carbon/ai-chat`) to request focus without understanding the internal structure of child components (like `@carbon/ai-chat-components`).

## Focus Management Utilities

The `@carbon/ai-chat-components` package provides comprehensive focus management utilities in `@carbon/ai-chat-components/es/globals/utils/focus-utils` that handle complex scenarios including:

- **Visibility checks**: Elements hidden via CSS (`display: none`, `visibility: hidden`)
- **Accessibility attributes**: Elements with `[hidden]`, `[inert]`, or `[aria-hidden="true"]`
- **Disabled states**: Both native and custom elements with `[disabled]` or `[aria-disabled="true"]`
- **Focusability validation**: Standard focusable elements and custom elements with shadow DOM
- **Shadow DOM traversal**: Proper handling of shadow boundaries and `delegatesFocus`

### Available Utilities

```typescript
import {
  tryFocus,
  isFocusable,
  isElementInvisible,
  walkComposedTree,
  getFirstAndLastFocusableChildren,
} from "@carbon/ai-chat-components/es/globals/utils/focus-utils";
```

#### `tryFocus(element, exceptions?)`

Enhanced focus utility that validates visibility, accessibility, and focusability before attempting to set focus.

```typescript
/**
 * @param element - The element to attempt to focus
 * @param exceptions - Array of selectors to ignore when checking visibility (e.g., 'dialog', '[popover]')
 * @returns True if focus was successfully set, false otherwise
 */
const focused = tryFocus(element);
```

#### `isFocusable(element)`

Checks if an element is focusable, including support for custom elements with shadow DOM.

```typescript
/**
 * @param element - The DOM element to check for focusability
 * @returns True if the element is focusable, false otherwise
 */
const canFocus = isFocusable(element);
```

#### `isElementInvisible(element, exceptions?)`

Checks if an element should be ignored due to visibility or accessibility attributes.

```typescript
/**
 * @param element - The DOM element to check
 * @param exceptions - Array of selectors to ignore (e.g., 'dialog', '[popover]')
 * @returns True if the element should be ignored, false otherwise
 */
const invisible = isElementInvisible(element);
```

#### `walkComposedTree(node, whatToShow?, filter?, skipNode?)`

Traverses the composed tree (including shadow DOM) to find elements matching criteria.

```typescript
/**
 * @param node - The root node for traversal
 * @param whatToShow - NodeFilter code for node types (use 0 for all nodes)
 * @param filter - Function to filter nodes
 * @param skipNode - Function to skip nodes and their children
 * @returns Iterator yielding matching nodes
 */
for (const element of walkComposedTree(
  root,
  NodeFilter.SHOW_ELEMENT,
  isFocusable,
)) {
  // Process focusable elements
}
```

#### `getFirstAndLastFocusableChildren(walker)`

Helper to find the first and last focusable children from a tree walker.

```typescript
/**
 * @param walker - Iterator from walkComposedTree
 * @returns Tuple of [first, last] focusable elements (or null if none found)
 */
const [first, last] = getFirstAndLastFocusableChildren(walker);
```

## The Pattern

### Core Concept

Each web component that contains focusable elements should implement a `requestFocus()` method that:

1. **Returns a boolean**: `true` if focus was successfully set, `false` if no focusable element was found
2. **Encapsulates internal logic**: The component decides which element to focus based on its own priority rules
3. **Enables fallback behavior**: Parent components can try alternative focus targets if the method returns `false`

### Method Signature

```typescript
/**
 * Requests focus on the best available focusable element within the component.
 * @returns {boolean} True if focus was successfully set, false otherwise
 */
requestFocus(): boolean;
```

### Implementation Pattern

**Recommended: Use the shared `tryFocus` utility**

```typescript
import { tryFocus } from "../../../globals/utils/focus-utils.js";

requestFocus(): boolean {
  // Try focus targets in priority order
  // 1. Try highest priority element
  const highPriorityElement = this.shadowRoot?.querySelector('.high-priority');
  if (tryFocus(highPriorityElement)) {
    return true;
  }

  // 2. Try medium priority element
  const mediumPriorityElement = this.shadowRoot?.querySelector('.medium-priority');
  if (tryFocus(mediumPriorityElement)) {
    return true;
  }

  // 3. Try any other focusable element as fallback
  const focusableElements = this.shadowRoot?.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]'
  );
  for (const element of focusableElements) {
    if (tryFocus(element)) {
      return true;
    }
  }

  // No focusable element found
  return false;
}
```

**Benefits of using the shared utility:**

- ✅ Handles visibility checks automatically
- ✅ Respects accessibility attributes (`[hidden]`, `[inert]`, `[aria-hidden]`)
- ✅ Validates focusability (including custom elements with shadow DOM)
- ✅ Skips disabled elements (both `[disabled]` and `[aria-disabled]`)
- ✅ Verifies focus was actually set
- ✅ Consistent behavior across all components

**Legacy pattern (not recommended):**

If you need a simple inline helper for basic cases:

```typescript
requestFocus(): boolean {
  // Simple helper - use shared tryFocus utility instead for production code
  const tryFocusSimple = (element: HTMLElement | null | undefined): boolean => {
    if (element && !element.hasAttribute("disabled")) {
      element.focus();
      return document.activeElement === element;
    }
    return false;
  };

  // ... rest of implementation
}
```

## Usage in React

### TypeScript Interface

Define a handle interface for the component:

```typescript
export interface ComponentHandle {
  /**
   * Requests focus on the best available focusable element within the component.
   * Returns true if focus was successfully set, false otherwise.
   */
  requestFocus(): boolean;
}
```

### Parent Component Usage

```tsx
import { useRef } from "react";
import ChatHeader, {
  ChatHeaderHandle,
} from "@carbon/ai-chat-components/react/chat-header";

function ParentComponent() {
  const headerRef = useRef<ChatHeaderHandle>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFocusRequest = () => {
    // Try to focus the header first
    const headerFocused = headerRef.current?.requestFocus();

    if (!headerFocused) {
      // Header couldn't focus anything, try the input field
      inputRef.current?.focus();
    }
  };

  return (
    <>
      <ChatHeader ref={headerRef} />
      <input ref={inputRef} />
    </>
  );
}
```

## Chat Header Focus Priority

The `cds-aichat-chat-header` component implements the following focus priority:

### Priority Order

1. **Fixed Actions Slot** (Highest Priority)
   - Usually contains the close button
   - Most important for accessibility (users need to be able to close the chat)
   - Checked first: `slot[name="fixed-actions"]`

2. **Navigation Slot**
   - Contains back button or overflow menu
   - Important for navigation within the chat
   - Checked second: `slot[name="navigation"]`

3. **Actions Array**
   - Dynamic actions rendered by the toolbar
   - May overflow into a menu
   - Checked third: toolbar's `cds-icon-button` elements

4. **Any Other Focusable Element** (Fallback)
   - Generic focusable elements as last resort
   - Includes: buttons, links, inputs, selects, textareas, elements with tabindex

### Rationale

#### Why Fixed Actions First?

The close button (typically in fixed-actions) is the most critical control for accessibility:

- Users with screen readers need a reliable way to exit the chat
- Keyboard users need a predictable focus target
- It's always visible (never overflows)
- It's the most common user action when opening the chat

#### Why Navigation Second?

Navigation controls (back button, overflow menu) are the next most important:

- They provide access to other parts of the interface
- They're typically always visible
- They're less critical than the close button but more important than content actions

#### Why Actions Array Third?

Dynamic actions are less predictable:

- They may overflow into a menu
- They may not always be present
- They're typically content-specific rather than structural

#### Why Generic Fallback Last?

The generic fallback ensures we always try to focus something:

- Prevents focus from being lost
- Handles edge cases where custom content is provided
- Maintains accessibility even with unusual configurations

### Customization Considerations

The priority order is designed for the typical chat header use case, but developers can customize behavior by:

1. **Controlling slot content**: Place the most important button in the fixed-actions slot
2. **Using fixedActions property**: Buttons passed via this property are rendered in fixed-actions
3. **Disabling buttons**: Disabled buttons are automatically skipped
4. **Custom focus handling**: Parent components can implement their own logic based on the boolean return value

## Benefits of This Pattern

### 1. Separation of Concerns

- Parent components don't need to know internal structure
- Child components control their own focus behavior
- Changes to internal structure don't break parent components

### 2. Flexibility

- Each component can define its own priority rules
- Parent components can implement fallback strategies
- Works with both slotted content and properties

### 3. Accessibility

- Ensures focus is always managed predictably
- Respects disabled states
- Provides fallback behavior

### 4. Reusability

- Same pattern can be used across all web components
- Consistent API for focus management
- Easy to understand and implement

### 5. Testability

- Boolean return value makes testing straightforward
- Can verify focus behavior without inspecting internal structure
- Easy to test fallback scenarios

## Future Applications

This pattern should be applied to other web components as they are created. **Always use the shared `tryFocus` utility** for consistent behavior:

### Input Component (Future)

```typescript
import { tryFocus } from "../../../globals/utils/focus-utils.js";

requestFocus(): boolean {
  // Priority:
  // 1. Text input field
  const input = this.shadowRoot?.querySelector('input[type="text"]');
  if (tryFocus(input)) return true;

  // 2. Send button
  const sendButton = this.shadowRoot?.querySelector('.send-button');
  if (tryFocus(sendButton)) return true;

  // 3. Attachment button
  const attachButton = this.shadowRoot?.querySelector('.attach-button');
  if (tryFocus(attachButton)) return true;

  // 4. Any other focusable element
  const focusable = this.shadowRoot?.querySelector('button, [href], input, select, textarea, [tabindex]');
  return tryFocus(focusable);
}
```

### Message Component (Future)

```typescript
import { tryFocus } from "../../../globals/utils/focus-utils.js";

requestFocus(): boolean {
  // Priority:
  // 1. Action buttons (copy, regenerate, etc.)
  const actionButton = this.shadowRoot?.querySelector('.action-button');
  if (tryFocus(actionButton)) return true;

  // 2. Links in message content
  const link = this.shadowRoot?.querySelector('a[href]');
  if (tryFocus(link)) return true;

  // 3. Any other focusable element
  const focusable = this.shadowRoot?.querySelector('button, [href], input, select, textarea, [tabindex]');
  return tryFocus(focusable);
}
```

### Panel Component (Future)

```typescript
import { tryFocus } from "../../../globals/utils/focus-utils.js";

requestFocus(): boolean {
  // Priority:
  // 1. Close button
  const closeButton = this.shadowRoot?.querySelector('.close-button');
  if (tryFocus(closeButton)) return true;

  // 2. Primary action button
  const primaryButton = this.shadowRoot?.querySelector('.primary-action');
  if (tryFocus(primaryButton)) return true;

  // 3. First focusable element in content
  const focusable = this.shadowRoot?.querySelector('button, [href], input, select, textarea, [tabindex]');
  return tryFocus(focusable);
}
```

## Testing Guidelines

### Unit Tests

Each component should test:

1. **Successful focus**: Verify `requestFocus()` returns `true` when focusable elements exist
2. **Failed focus**: Verify `requestFocus()` returns `false` when no focusable elements exist
3. **Priority order**: Verify correct element receives focus based on priority
4. **Disabled elements**: Verify disabled elements are skipped
5. **Shadow DOM**: Verify focus works correctly with shadow DOM boundaries

### Integration Tests

Parent components should test:

1. **Fallback behavior**: Verify fallback focus targets are used when `requestFocus()` returns `false`
2. **Multiple components**: Verify focus management works with multiple child components
3. **Dynamic content**: Verify focus management works when content changes

## Example Test

```typescript
describe("ChatHeader requestFocus", () => {
  it("should focus close button first", async () => {
    const header = await fixture(html`
      <cds-aichat-chat-header>
        <button slot="fixed-actions" id="close">Close</button>
        <button slot="navigation" id="back">Back</button>
      </cds-aichat-chat-header>
    `);

    const result = header.requestFocus();

    expect(result).to.be.true;
    expect(document.activeElement?.id).to.equal("close");
  });

  it("should return false when no focusable elements exist", async () => {
    const header = await fixture(html`
      <cds-aichat-chat-header></cds-aichat-chat-header>
    `);

    const result = header.requestFocus();

    expect(result).to.be.false;
  });

  it("should skip disabled buttons", async () => {
    const header = await fixture(html`
      <cds-aichat-chat-header>
        <button slot="fixed-actions" disabled>Close</button>
        <button slot="navigation" id="back">Back</button>
      </cds-aichat-chat-header>
    `);

    const result = header.requestFocus();

    expect(result).to.be.true;
    expect(document.activeElement?.id).to.equal("back");
  });
});
```

## Advanced Usage: Shadow DOM Traversal

For complex components that need to traverse shadow DOM boundaries:

```typescript
import { walkComposedTree, isFocusable, tryFocus } from "../../../globals/utils/focus-utils.js";

requestFocus(): boolean {
  // Walk the composed tree to find all focusable elements
  const walker = walkComposedTree(
    this,
    NodeFilter.SHOW_ELEMENT,
    isFocusable
  );

  // Try to focus the first focusable element
  for (const element of walker) {
    if (tryFocus(element)) {
      return true;
    }
  }

  return false;
}
```

## Best Practices

1. **Always use the shared utilities**: Import from `@carbon/ai-chat-components/es/globals/utils/focus-utils`
2. **Don't reinvent the wheel**: The utilities handle edge cases you might miss
3. **Test with assistive technology**: Verify focus management works with screen readers
4. **Consider exceptions**: Use the `exceptions` parameter for special cases like dialogs or popovers
5. **Document priority order**: Clearly comment why elements are focused in a specific order

## Conclusion

This generic focus management pattern, combined with the comprehensive utilities in `@carbon/ai-chat-components`, provides a robust solution for managing focus across web components. By implementing `requestFocus()` consistently and using the shared `tryFocus` utility, we create a predictable and accessible user experience while maintaining proper separation of concerns between parent and child components.

The utilities handle complex scenarios including visibility, accessibility attributes, disabled states, and shadow DOM traversal, ensuring consistent and reliable focus management throughout the application.
