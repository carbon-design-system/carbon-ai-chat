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

## New Features

- `assistantName`: Sets name for announcements/labels
- `isReadonly`: Enables read-only mode for past conversations
- `locale`: Pure config-driven locale switching

## Server/SSR

Use `@carbon/ai-chat/server` for server-safe imports without web component registration. Good for grabbing types in your TypeScript server.
