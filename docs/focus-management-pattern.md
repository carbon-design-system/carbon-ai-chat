# Generic Focus Management Pattern for Web Components

## Overview

This document describes a reusable pattern for implementing focus management in web components. The pattern allows parent components (like `@carbon/ai-chat`) to request focus without understanding the internal structure of child components (like `@carbon/ai-chat-components`).

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

```typescript
requestFocus(): boolean {
  // Helper to try focusing an element
  const tryFocus = (element: HTMLElement | null | undefined): boolean => {
    if (element && !element.hasAttribute("disabled")) {
      element.focus();
      return document.activeElement === element;
    }
    return false;
  };

  // Try focus targets in priority order
  // 1. Try highest priority element
  const highPriorityElement = this.shadowRoot?.querySelector('.high-priority');
  if (tryFocus(highPriorityElement as HTMLElement)) {
    return true;
  }

  // 2. Try medium priority element
  const mediumPriorityElement = this.shadowRoot?.querySelector('.medium-priority');
  if (tryFocus(mediumPriorityElement as HTMLElement)) {
    return true;
  }

  // 3. Try any other focusable element as fallback
  const focusableElements = this.shadowRoot?.querySelectorAll(
    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"]):not([disabled])'
  );
  if (focusableElements && focusableElements.length > 0) {
    if (tryFocus(focusableElements[0] as HTMLElement)) {
      return true;
    }
  }

  // No focusable element found
  return false;
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

This pattern should be applied to other web components as they are created:

### Input Component (Future)

```typescript
requestFocus(): boolean {
  // Priority:
  // 1. Text input field
  // 2. Send button
  // 3. Attachment button
  // 4. Any other focusable element
}
```

### Message Component (Future)

```typescript
requestFocus(): boolean {
  // Priority:
  // 1. Action buttons (copy, regenerate, etc.)
  // 2. Links in message content
  // 3. Any other focusable element
}
```

### Panel Component (Future)

```typescript
requestFocus(): boolean {
  // Priority:
  // 1. Close button
  // 2. Primary action button
  // 3. First focusable element in content
  // 4. Any other focusable element
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

## Conclusion

This generic focus management pattern provides a clean, reusable solution for managing focus across web components. By implementing `requestFocus()` consistently across all components, we create a predictable and accessible user experience while maintaining proper separation of concerns between parent and child components.
