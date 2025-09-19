---
title: Migration 0.5.x -> 1.0.0
---

# Upgrading from @carbon/ai-chat 0.5.x to 1.0.0

Version 1.0.0 introduces **live config updates**. Changes to `PublicConfig` now apply automatically without restarting the chat. This simplifies usage and removes many imperative methods.

## Breaking Changes

### Config Structure:

- `showLauncher` -> `launcher.isOn`
- `headerConfig` -> `header`
- `themeConfig` -> removed (see theming below)
- All `PublicConfig` properties are now top-level props (no more `config` prop)

### Separate build folder for custom prefix:

Instead of pulling from the `es-custom` folder and using the `cds-custom-*` components from `@carbon/web-components`, we are now using components straight from `es` and generating our own `es-custom` folder to handle the custom registry issues that may arise from using the `@carbon/ai-chat` package alongside `carbon-angular-components`. See migration examples below for details.

### Service Desk:

- `serviceDesk` and `serviceDeskFactory` moved out of config to top-level props

### Theming:

- Use `aiEnabled` for AI theme toggle (default: `true`)
- Use `injectCarbonTheme` for Carbon tokens (default: inherit from page)
- Use `layout.corners` for rounded/square corners

### Header:

- New: `header.title`, `header.name`, `header.menuOptions`
- Removed: `header.showCloseAndRestartButton`

### Home Screen:

- Removed: `homescreen.background` (background styling is now managed automatically)

### ChatInstance.getState

`getState()` now returns a frozen `PublicChatState` that exposes the sessionStorage-backed fields as top-level properties (e.g. `version`, `viewState`, `showUnreadIndicator`, `homeScreenState`, etc.). The `humanAgent` block contains the persisted human-agent data plus a live `isConnecting` flag sourced from in-memory state. Treat the returned object as read-only and call `getState()` again when you need fresh values.

### Removed Methods:

Many `updateX` methods on `ChatInstance` removed. Update config instead.

Key replacements:

- `updateLanguagePack()` -> pass `strings` prop (DeepPartial<LanguagePack>)
- `updateHomeScreenConfig()` -> set `homescreen` config
- `updateLocale()` -> set `locale` config
- `updateCSSVariables()` -> set `layout.customProperties` config
- `updateMainHeaderTitle()` -> set `header.title` config
- `updateLauncherConfig()` -> set `launcher` config
- `updateCustomMenuOptions()` -> set `header.menuOptions` config
- `updateHeaderConfig()` -> set `header` config

### Removed functionality:

- `updateMainHeaderAvatar()` -> no replacement (functionality removed)
- `instance.elements` -> no replacement (functionality removed)

**Note:** The `elements` API provided direct DOM access to input fields and the main window. This functionality is being replaced with the ability to pass custom header and footer components instead of controlling everything via DOM access. Custom component support will be added in a future version.

**Note:** The `addClassName`/`removeClassName` methods were used to manually control MainWindow visibility in custom elements. MainWindow now handles its own visibility consistently in both floating and custom element modes, so external className manipulation is no longer needed.

## Migration Examples

### Launcher

```ts
// Before
const config = { showLauncher: true };

// After
const config = { launcher: { isOn: true } };
```

### Header

```ts
// Before
const config = {
  headerConfig: {
    minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
    showRestartButton: true,
  },
};

// After
const config = {
  header: {
    title: "Welcome",
    name: "My Bot",
    minimizeButtonIconType: MinimizeButtonIconType.MINIMIZE,
    showRestartButton: true,
  },
};
```

### Theming

```ts
// Before
const config = {
  themeConfig: {
    theme: ThemeType.CARBON_AI,
    carbonTheme: CarbonTheme.G90,
    corners: CornersType.SQUARE,
  },
};

// After
const config = {
  aiEnabled: true,
  injectCarbonTheme: CarbonTheme.G90,
  layout: { corners: CornersType.SQUARE },
};
```

### CSS Variables

```ts
// Before
instance.updateCSSVariables({
  BASE_HEIGHT: "600px",
  BASE_WIDTH: "400px",
  BASE_Z_INDEX: "9999",
});

// After
const config = {
  layout: {
    customProperties: {
      HEIGHT: "600px",
      WIDTH: "400px",
      Z_INDEX: "9999",
    },
  },
};
```

### `es-custom` folder

**Note:** You only need to import from the `es-custom` folder if you are facing component registry issues. This usually happens when using the `@carbon/ai-chat` package alongside `carbon-angular-components` where the component names clash with the underlying subcomponents from `@carbon/web-components`.

If not using alongside `carbon-angular-components`, resume importing from the `es` folder and using the `cds-aichat` prefix.

```ts
// Before
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";

...

render() {
  return html`
    <cds-aichat-container ....> </cds-aichat-container>
    <cds-aichat-custom-element ....> </cds-aichat-custom-element>
  `;

// After
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js";
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-custom-element/index.js";

...

render() {
  return html`
    <cds-custom-aichat-container ....> </cds-custom-aichat-container>
    <cds-custom-aichat-custom-element ....> </cds-custom-aichat-custom-element>
  `;
```

### React Usage (Interface Flattening)

```tsx
// Before
<ChatContainer
  config={{
    debug: true,
    header: { title: "My Assistant" },
    launcher: { isOn: true },
  }}
  serviceDeskFactory={myFactory}
/>

// After
<ChatContainer
  debug={true}
  header={{ title: "My Assistant" }}
  launcher={{ isOn: true }}
  serviceDeskFactory={myFactory}
/>
```

## Applying Config Updates

**React:**

```tsx
const [config, setConfig] = useState({
  /* initial config */
});
const switchLanguage = () => setConfig((c) => ({ ...c, locale: "fr" }));
return <ChatContainer {...config} />;
```

**Web Components:**

```ts
const el = document.querySelector("cds-aichat-container");
el.launcher = { isOn: false };
```

## Testing: Panel-Scoped Test IDs

**Breaking Change**: Test ID structure has been updated to use panel-scoped approach for better testing reliability.

### What Changed

- Removed: `makeTestId()` utility function
- Removed: `PrefixedId` type
- Removed: `OverlayPanelName` enum (consolidated into `PageObjectId`)
- Added: Panel test IDs consolidated into `PageObjectId` for single import convenience

### Migration

**Before (0.5.x):**

```ts
// Using makeTestId with duplicate test ID issues
import {
  makeTestId,
  PageObjectId,
  OverlayPanelName,
} from "@carbon/ai-chat/server";

// Tests had duplicate test ID problems when multiple panels existed
await expect(page.getByTestId("input_send")).toBeVisible(); // Could find 2+ elements
await expect(
  page.getByTestId(makeTestId(PageObjectId.INPUT_SEND, OverlayPanelName.MAIN)),
).click();
```

**After (1.0.0):**

```ts
// Using panel-scoped approach - cleaner and more reliable
// PageObjectId now includes all panel identifiers - no need for OverlayPanelName
import { PageObjectId } from "@carbon/ai-chat/server";

// Each panel has its own scope - no more duplicates
const mainPanel = page.getByTestId(PageObjectId.MAIN_PANEL);
await expect(mainPanel.getByTestId(PageObjectId.INPUT)).fill("Hello");
await expect(mainPanel.getByTestId(PageObjectId.INPUT_SEND)).click();
await expect(mainPanel.getByTestId(PageObjectId.CLOSE_CHAT)).click();
```

### Available Panel Test IDs

All panel identifiers are now available through `PageObjectId`:

- `PageObjectId.MAIN_PANEL` (`main_panel`): Main chat interface
- `PageObjectId.DISCLAIMER_PANEL` (`disclaimer_panel`): Disclaimer screen
- `PageObjectId.HOME_SCREEN_PANEL` (`home_screen_panel`): Home screen
- `PageObjectId.HYDRATING_PANEL` (`hydrating_panel`): Loading state
- `PageObjectId.CATASTROPHIC_PANEL` (`catastrophic_panel`): Error state
- `PageObjectId.IFRAME_PANEL` (`iframe_panel`): IFrame content panel
- `PageObjectId.CONVERSATIONAL_SEARCH_CITATION_PANEL` (`conversational_search_citation_panel`): Citation panel
- `PageObjectId.CUSTOM_PANEL` (`custom_panel`): Custom content panel
- `PageObjectId.BUTTON_RESPONSE_PANEL` (`button_response_panel`): Panel opened from button responses

## New Features

- `assistantName`: Sets name for announcements/labels
- `isReadonly`: Enables read-only mode for past conversations
- `locale`: Pure config-driven locale switching

## Server/SSR

Use `@carbon/ai-chat/server` for server-safe imports without web component registration. Good for grabbing types in your TypeScript server.
