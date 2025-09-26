# Demo Testing Guide

## Programmatic Configuration Mode

Use `window.setChatConfig` to restart the demo with a supplied config instead of clicking through the sidebar.

```javascript
await window.setChatConfig({
  header: { title: "Carbon Assistant", name: "Carbon" },
  injectCarbonTheme: "g100",
  launcher: { isOn: false },
  openChatByDefault: true,
});
```

`setChatConfig` returns a Promise—always await it before interacting with the UI.

## Browser Console Workflow

- Navigate to `/?config=setChatConfig`
- Paste the quick-start snippet above into DevTools
- Wait for the promise to resolve before interacting; `window.chatInstance` becomes available once the chat restarts
- Call `setChatConfig` again any time you want to adjust options—the helper tears down and rebuilds for you

Example tweaks:

```javascript
await window.setChatConfig({
  disclaimer: {
    isOn: true,
    disclaimerHTML: "Please accept before continuing.",
  },
  messaging: {
    customSendMessage: async (payload) => console.log(payload),
  },
});
```

## Playwright Recipe

```typescript
import { test, expect } from "@playwright/test";
import { PageObjectId } from "@carbon/ai-chat/server";
import {
  prepareDemoPage,
  destroyChatSession,
  openChatWindow,
  waitForChatReady,
  waitForSetChatConfigApplied,
} from "./utils";
import type {} from "../types/window";

test.beforeEach(async ({ page }) => {
  // Load demo in setChatConfig mode and block analytics pop-ups
  await prepareDemoPage(page, { setChatConfig: true });
});

test.afterEach(async ({ page }) => {
  // Clean up chat session to prevent state leaks between tests
  await destroyChatSession(page);
});

test("updates header", async ({ page }) => {
  // Configure chat settings programmatically
  await page.evaluate(async () => {
    await window.setChatConfig({
      header: { title: "Carbon AI Chat" },
      injectCarbonTheme: "g90",
    });
  });

  // Wait for React state updates after setChatConfig
  await waitForSetChatConfigApplied(page);

  // Open the chat interface and wait for it to be ready
  await openChatWindow(page);
  await waitForChatReady(page, { panelTestId: PageObjectId.MAIN_PANEL });

  // Verify the header title was updated
  await expect(page.getByTestId(PageObjectId.HEADER_TITLE)).toContainText(
    "Carbon AI Chat",
  );

  // Access chat instance state for advanced assertions
  const chatState = await page.evaluate(() => {
    return window.chatInstance.getState();
  });
  expect(chatState.config.header.title).toBe("Carbon AI Chat");
});
```

## Helpers

- `prepareDemoPage(page, { setChatConfig: true })` loads `/?config=setChatConfig` and blocks analytics pop-ups
- `destroyChatSession(page)` clears any existing widget between tests to prevent state leaks
- `waitForSetChatConfigApplied(page)` waits for React state updates after `setChatConfig` calls (avoids arbitrary timeouts)
- `openChatWindow(page)` keeps calling `changeView` until the main window opens (handles async view state changes)
- `waitForChatReady(page, { panelTestId })` waits for hydration spinner to disappear and specified panel to appear; pass `PageObjectId.DISCLAIMER_PANEL` when a disclaimer overlays the chat or `null` when the chat should stay closed
