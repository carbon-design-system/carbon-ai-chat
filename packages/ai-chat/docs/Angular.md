---
title: Using with Angular
---

## Overview

Angular renders the Carbon AI Chat web components directly, so the [web component guide](./WebComponent.md) is your main reference — its setup, configuration, {@link ChatInstance} API, and customization all apply unchanged. This page covers only the Angular-specific wiring: registering the custom elements, and switching to the `es-custom` build if you use `carbon-angular-components`.

> **Note**: This page covers only what's specific to Angular. For theming, layout, slotting your own content, and the rest of the configuration shared across every framework, see [UI customization](./Customization.md).

## Installation

Install using `npm`:

```
npm install @carbon/ai-chat
```

Or using `yarn`:

```
yarn add @carbon/ai-chat
```

> **Note**: Install the required `peerDependencies`. See the [peer dependency changes](https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/peer-dependency-changes.md) for a history of additions, removals, and version updates across releases.

## Basic example

Register the custom elements with `CUSTOM_ELEMENTS_SCHEMA`, import the web component, and use it in your template. Set complex configuration (objects, arrays, functions) as element properties through a `ViewChild` — Angular attribute binding only passes strings — and set `onBeforeRender` the same way to capture the {@link ChatInstance}:

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { ChatInstance } from "@carbon/ai-chat";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-container/index.js";

@Component({
  selector: "app-root",
  template: `<cds-aichat-container #chatContainer></cds-aichat-container>`,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  @ViewChild("chatContainer", { static: false }) chatContainer!: ElementRef;

  ngAfterViewInit() {
    const element = this.chatContainer.nativeElement;
    element.header = { title: "My Assistant" };
    element.onBeforeRender = (instance: ChatInstance) => {
      // Call instance methods here.
    };
  }
}
```

This is the `cds-aichat-container` float layout; for custom sizing use `cds-aichat-custom-element` ({@link CdsAiChatCustomElementAttributes}). Everything else — configuration options, the {@link ChatInstance} API, and response rendering — works exactly as described in the [web component guide](./WebComponent.md).

## Using alongside carbon-angular-components

`@carbon/ai-chat` builds on `@carbon/web-components`. When you also use `carbon-angular-components`, the shared `cds-` web-component names collide in the browser's custom-element registry. To avoid the clash, import from the `es-custom` build, which registers every component under a `cds-custom-` prefix:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js";

@Component({
  selector: "app-root",
  template: `<cds-custom-aichat-container></cds-custom-aichat-container>`,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {}
```

The components, properties, and types are identical to the regular build — only the import paths and the `cds-custom-aichat-*` tag names change, and types come from `@carbon/ai-chat/es-custom`.

## Related

- [Using as a Web component](./WebComponent.md) — the primary guide; everything here builds on it.
- [UI customization](./Customization.md) — theming, layout, and other configuration.
