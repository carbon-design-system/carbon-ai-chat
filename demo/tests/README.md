# Demo Testing Guide

## Programmatic Configuration Mode

Control chat configuration via JavaScript instead of clicking through UI controls.

### Quick Start

```javascript
// Basic usage
window.setChatConfig({
  aiEnabled: true,
  header: { title: "Carbon Assistant" },
});

// Change settings too
window.setChatConfig({ aiEnabled: false }, { layout: "sidebar" });
```

### What Happens

- **Sidebar hidden** - UI controls disappear
- **Notification shows** - Blue when active, red when no config provided
- **Chat updates** - Changes apply immediately
- **Demo messaging preserved** - No need to implement `customSendMessage`

### Common Examples

```javascript
// Headers
window.setChatConfig({
  header: { title: "Carbon Design System", name: "Carbon" },
});

// Themes
window.setChatConfig({ injectCarbonTheme: "cds--g100" }); // Carbon Gray 100 (Dark)
window.setChatConfig({ injectCarbonTheme: "cds--white" }); // Carbon White (Light)

// Layouts
window.setChatConfig({}, { layout: "sidebar" });
window.setChatConfig({}, { layout: "fullscreen" });

// Disable launcher
window.setChatConfig({ launcher: { isOn: false }, openChatByDefault: true });
```

### Playwright Testing

```javascript
test("carbon chat configuration", async ({ page }) => {
  await page.goto("/");
  await page.evaluate(() => {
    window.setChatConfig({ header: { title: "Carbon AI Chat" } });
  });
  await expect(page.locator("[data-testid='header_title']")).toContainText(
    "Carbon AI Chat",
  );
});
```

### Page Refresh

- **Refreshing loses config** - Shows error notification until you call `setChatConfig()` again
- **URL stays the same** - `?settings=programatic&config=programatic`

### Exit Programmatic Mode

Click **"Leave Programmatic Mode"** button in the notification, or navigate to demo URL without query parameters.
