---
title: Using with Angular
---

## Overview

Angular renders the Carbon AI Chat web components directly. The [web component guide](./WebComponent.md) is your main reference. Its setup, configuration, {@link ChatInstance} API, and customization all apply unchanged. This page covers only the Angular-specific wiring: registering the custom elements, and switching to the `es-custom` build if you use `carbon-angular-components`.

> **Note**: This page covers only what's specific to Angular. For theming, layout, slotting your own content, and the rest of the shared configuration, see [UI customization](./Customization.md).

## Installation

Install with `npm`:

```
npm install @carbon/ai-chat
```

Or with `yarn`:

```
yarn add @carbon/ai-chat
```

> **Note**: Install the required `peerDependencies`. See the [peer dependency changes](https://github.com/carbon-design-system/carbon-ai-chat/blob/main/docs/peer-dependency-changes.md) for additions, removals, and version updates across releases.

## Basic example

Register the custom elements with `CUSTOM_ELEMENTS_SCHEMA`, then import the web component and use it in your template. Because Angular attribute binding only passes strings, set complex configuration — objects, arrays, functions — as element properties through a `ViewChild`, and set `onBeforeRender` the same way to capture the {@link ChatInstance}:

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

This example uses the `cds-aichat-container` float layout. For custom sizing, use `cds-aichat-custom-element` ({@link CdsAiChatCustomElementAttributes}). Everything else works just as the [web component guide](./WebComponent.md) describes: configuration options, the {@link ChatInstance} API, and response rendering.

## Using alongside carbon-angular-components

`@carbon/ai-chat` builds on `@carbon/web-components`. When you also use `carbon-angular-components`, the shared `cds-` web-component names collide in the browser's custom-element registry. To avoid the clash, import from the `es-custom` build. It registers every component under a `cds-custom-` prefix:

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

The components, properties, and types match the regular build. Only the import paths and the `cds-custom-aichat-*` tag names change. Types come from `@carbon/ai-chat/es-custom`.

## Related

- [Using as a Web component](./WebComponent.md) — the main guide; everything here builds on it.
- [UI customization](./Customization.md) — theming, layout, and other configuration.
