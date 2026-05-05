---
title: Using with Angular
---

### Overview

When using `@carbon/ai-chat` in Angular applications alongside `carbon-angular-components`, you must import from the `es-custom` build to avoid component registry conflicts. The `es-custom` build uses a separate prefix (`cds-custom-`) for all web components.

Carbon AI chat exports two web components:

- `cds-custom-aichat-container` - For the `float` layout with a launcher
- `cds-custom-aichat-custom-element` - For custom sizing (sidebar, full-screen, or nested UI)

### Installation

Install using `npm`:

```bash
npm install @carbon/ai-chat
```

Or using `yarn`:

```bash
yarn add @carbon/ai-chat
```

_Be sure to check for required peerDependencies._

### Basic example

Import the web components in your Angular component and use them in your template:

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js";

@Component({
  selector: "app-root",
  template: ` <cds-custom-aichat-container></cds-custom-aichat-container> `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {}
```

### Using cds-custom-aichat-container

The `cds-custom-aichat-container` component loads and renders an instance of the Carbon AI Chat when it mounts and deletes that instance when unmounted. If option changes occur in the Carbon AI Chat configuration, it also deletes the previous Carbon AI Chat and creates a new one with the new configuration.

See {@link CdsAiChatContainerAttributes} for an explanation of the various accepted properties and attributes.

#### Configuring properties

For complex properties (objects, arrays, functions), use property binding in your Angular component:

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { PublicConfig } from "@carbon/ai-chat/es-custom";
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js";

@Component({
  selector: "app-root",
  template: `
    <cds-custom-aichat-container #chatContainer></cds-custom-aichat-container>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  @ViewChild("chatContainer", { static: false }) chatContainer!: ElementRef;

  ngAfterViewInit() {
    const element = this.chatContainer.nativeElement;
    element.header = { title: "My Assistant" };
    element.launcher = { isOn: true };
  }
}
```

### Using cds-custom-aichat-custom-element

Use `cds-custom-aichat-custom-element` to render the Carbon AI Chat inside a custom element with custom sizing.

The custom element should be sized using external CSS. The default behavior is to set the element's dimensions to 0x0, so that it doesn't take up space while keeping any fixed-positioned launcher visible.

**Note:** The custom element must remain visible if you want to use the built-in Carbon AI Chat launcher.

```typescript
import { Component, CUSTOM_ELEMENTS_SCHEMA } from "@angular/core";
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-custom-element/index.js";

@Component({
  selector: "app-root",
  template: `
    <cds-custom-aichat-custom-element></cds-custom-aichat-custom-element>
  `,
  styles: [
    `
      :host {
        height: 100vh;
        width: 100vw;
      }
    `,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {}
```

### Accessing instance methods

Use the {@link CdsAiChatContainerAttributes.onBeforeRender} or {@link CdsAiChatContainerAttributes.onAfterRender} callbacks to access the Carbon AI Chat instance:

```typescript
import {
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  ViewChild,
} from "@angular/core";
import { ChatInstance } from "@carbon/ai-chat/es-custom";
import "@carbon/ai-chat/dist/es-custom/web-components/cds-aichat-container/index.js";

@Component({
  selector: "app-root",
  template: `
    <cds-custom-aichat-container #chatContainer></cds-custom-aichat-container>
    <button *ngIf="instance" (click)="toggleChat()">Toggle Chat</button>
  `,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
})
export class AppComponent {
  @ViewChild("chatContainer", { static: false }) chatContainer!: ElementRef;
  instance?: ChatInstance;

  ngAfterViewInit() {
    const element = this.chatContainer.nativeElement;
    element.onBeforeRender = (instance: ChatInstance) => {
      this.instance = instance;
    };
    element.header = { title: "My Assistant" };
    element.launcher = { isOn: true };
  }

  toggleChat() {
    if (this.instance) {
      this.instance.toggleOpen();
    }
  }
}
```
