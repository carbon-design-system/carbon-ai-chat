/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element (Sidebar) (Web components)
 *
 * Demonstrates: rendering Carbon AI Chat as a docked side panel by mounting
 * `<cds-aichat-custom-element>` inside a host `<div>` styled with the library's
 * shipped `cds-aichat-sidebar` layout classes. A host header bar carries a
 * toggle button that opens and closes the panel; the `VIEW_CHANGE` /
 * `VIEW_PRE_CHANGE` bus events drive the slide-in and slide-out animation so
 * the chat only unmounts once the CSS transition has finished.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` styled with the shipped sidebar-layout CSS
 *     (`@carbon/ai-chat/css/chat-sidebar-layout.css`)
 *   - `BusEventType.VIEW_CHANGE` / `BusEventType.VIEW_PRE_CHANGE`
 *   - `BusEventViewChange` / `BusEventViewPreChange` payloads
 *   - `ChatInstance.changeView` with `ViewType.MAIN_WINDOW` / `ViewType.LAUNCHER`
 *   - `PublicConfig.layout.corners` (`CornersType.SQUARE`)
 *   - `PublicConfig.openChatByDefault`
 *   - `PublicConfig.messaging.customSendMessage` (see `./customSendMessage.ts`)
 *
 * Start reading at: the `config` constant, then `onBeforeRender` and the
 * view-change handlers.
 */

import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat/css/chat-sidebar-layout.css";
import "./styles.css";

import {
  BusEventType,
  CornersType,
  ViewType,
  type BusEvent,
  type BusEventViewChange,
  type BusEventViewPreChange,
  type ChatInstance,
  type PublicConfig,
} from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch20 from "@carbon/icons/es/ai-launch/20.js";

import { customSendMessage } from "./customSendMessage";

// Hold the view transition long enough for the 240ms slide-out CSS transition
// to visibly finish before the chat unmounts.
const sleep = (milliseconds: number) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

const config: PublicConfig = {
  messaging: {
    // Wire the local mock backend instead of a real assistant so the example
    // runs offline; see `./customSendMessage.ts`.
    customSendMessage,
  },
  layout: {
    // Square corners let the chat sit flush inside the docked sidebar chrome
    // instead of showing the default rounded floating-window corners.
    corners: CornersType.SQUARE,
  },
  // Auto-open the conversation on mount so the sidebar is visible from first
  // paint; the header button can still toggle it closed afterwards.
  openChatByDefault: true,
};

@customElement("my-app")
export class Demo extends LitElement {
  // Disable shadow DOM so the document-level sidebar-layout CSS imported from
  // @carbon/ai-chat (and the local styles.css) applies to the host elements.
  createRenderRoot() {
    return this;
  }

  @state()
  accessor instance!: ChatInstance;

  // `sideBarOpen` is the resting open/closed state; `sideBarClosing` is the
  // transient state while the slide-out animation plays.
  @state()
  accessor sideBarOpen: boolean = true;

  @state()
  accessor sideBarClosing: boolean = false;

  // Guards the toggle button against re-entry while a `changeView` is still
  // resolving, so the animation cannot get stuck mid-transition.
  @state()
  accessor clickInProgress: boolean = false;

  onBeforeRender = (instance: ChatInstance) => {
    // Cache the instance so the header button can drive changeView later.
    this.instance = instance;

    // VIEW_CHANGE reports the resting view state once a transition settles.
    instance.on({
      type: BusEventType.VIEW_CHANGE,
      handler: this.onViewChange,
    });

    // VIEW_PRE_CHANGE fires before the view changes, giving the host a chance
    // to play the closing animation before the chat unmounts.
    instance.on({
      type: BusEventType.VIEW_PRE_CHANGE,
      handler: this.onViewPreChange,
    });
  };

  onViewChange = (event: BusEvent) => {
    const { newViewState } = event as BusEventViewChange;
    if (newViewState.mainWindow) {
      // mainWindow is visible: the sidebar has reached its open resting state.
      this.sideBarOpen = true;
    } else {
      // mainWindow is hidden: clear both flags to reach the closed resting state.
      this.sideBarOpen = false;
      this.sideBarClosing = false;
    }
  };

  onViewPreChange = async (event: BusEvent) => {
    const { newViewState } = event as BusEventViewPreChange;
    if (!newViewState.mainWindow) {
      // Apply the closing modifier so the slide-out transition starts while the
      // chat is still mounted, then hold the view change until it finishes.
      this.sideBarClosing = true;
      await sleep(250);
    }
  };

  handleHeaderButtonClick = async () => {
    if (!this.instance || this.clickInProgress) {
      return;
    }

    this.clickInProgress = true;
    try {
      const state = this.instance.getState();
      if (state.viewState.mainWindow) {
        // Open now: LAUNCHER hides the mainWindow and slides the sidebar out.
        await this.instance.changeView(ViewType.LAUNCHER);
      } else {
        // Closed now: MAIN_WINDOW re-mounts the chat and slides the sidebar in.
        await this.instance.changeView(ViewType.MAIN_WINDOW);
      }
    } finally {
      this.clickInProgress = false;
    }
  };

  getSidebarClassName() {
    // The closing modifier wins while the animation plays, otherwise the closed
    // modifier applies once the panel is shut.
    let className = "cds-aichat-sidebar";
    if (this.sideBarClosing) {
      className += " cds-aichat-sidebar--closing";
    } else if (!this.sideBarOpen) {
      className += " cds-aichat-sidebar--closed";
    }
    return className;
  }

  render() {
    return html`
      <header class="app-header">
        <h1 class="app-header__title">Custom Element Sidebar Example</h1>
        ${this.instance
          ? html`
              <button
                type="button"
                class="app-header__button"
                @click=${this.handleHeaderButtonClick}
                ?disabled=${this.clickInProgress}
                aria-label="Toggle AI Chat"
              >
                ${iconLoader(AiLaunch20)}
              </button>
            `
          : ""}
      </header>
      <div class=${this.getSidebarClassName()}>
        <cds-aichat-custom-element
          .onBeforeRender=${this.onBeforeRender}
          .messaging=${config.messaging}
          .layout=${config.layout}
          .openChatByDefault=${config.openChatByDefault}
          class="chat-custom-element"
        ></cds-aichat-custom-element>
      </div>
    `;
  }
}
