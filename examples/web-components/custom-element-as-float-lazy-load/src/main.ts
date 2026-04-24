/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/css/chat-float-layout.css";
import "@carbon/ai-chat/css/chat-launcher-layout.css";
import "@carbon/ai-chat-components/es/components/chat-shell/index.js";
import "@carbon/ai-chat-components/es/components/chat-button/index.js";

import {
  type BusEventViewChange,
  type ChatInstance,
  type PublicConfig,
  ViewType,
  readCarbonChatSession,
} from "@carbon/ai-chat";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch16 from "@carbon/icons/es/ai-launch/16.js";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

// Check once at page load whether the chat was open in the previous session.
// If so, auto-mount immediately (no launcher click required); otherwise wait.
const previousSession = readCarbonChatSession();
const chatWasPreviouslyOpen = previousSession?.viewState.mainWindow === true;

type FloatPhase = "idle" | "opening" | "open" | "closing" | "closed";

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  // Suppress the built-in launcher — our custom cds-aichat-button acts as the launcher.
  launcher: { isOn: false },
};

@customElement("my-app")
export class Demo extends LitElement {
  // Disable shadow DOM so float layout CSS from the imported stylesheets applies
  // to the cds-aichat-custom-element, cds-aichat-shell, and cds-aichat-button host elements.
  createRenderRoot() {
    return this;
  }

  @state()
  accessor _phase: FloatPhase = chatWasPreviouslyOpen ? "opening" : "idle";

  // True once the cds-aichat-custom-element bundle has been dynamically imported.
  @state()
  accessor _chatLoaded = false;

  // True once onAfterRender fires — signals the chat is fully initialized.
  // Gates removal of the ChatShell overlay.
  @state()
  accessor _chatReady = false;

  private _instance: ChatInstance | null = null;

  // Guards against the initial VIEW_CHANGE(mainWindow: false) that fires during
  // chat boot — we only trigger the closing animation after the chat has opened.
  private _hasEverOpened = false;

  connectedCallback() {
    super.connectedCallback();
    // Auto-load if a previous session was open.
    if (this._phase !== "idle") {
      void this._loadChat();
    }
  }

  updated(changedProps: Map<string | symbol, unknown>) {
    // When prefers-reduced-motion is set there is no CSS animation, so
    // animationend will never fire. Advance the phase immediately in that case.
    if (changedProps.has("_phase")) {
      if (
        (this._phase === "opening" || this._phase === "closing") &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ) {
        this._phase = this._phase === "opening" ? "open" : "closed";
      }
    }
  }

  // Dynamically import the custom element bundle on first open.
  async _loadChat() {
    if (this._chatLoaded) {
      return;
    }
    // The 3000 ms delay makes the lazy-loading behavior obvious on localhost and should be removed in a real implementation.
    await new Promise((resolve) => setTimeout(resolve, 3000));
    await import("@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js");
    this._chatLoaded = true;
  }

  _handleLauncherClick = () => {
    if (this._phase === "idle") {
      // First click: trigger the lazy load by setting phase and importing the bundle.
      this._phase = "opening";
      void this._loadChat();
    } else if (this._phase === "closed" && this._instance) {
      // Subsequent clicks: chat is already loaded; changeView triggers
      // _onViewChange which advances the phase to "opening".
      void this._instance.changeView(ViewType.MAIN_WINDOW);
    }
  };

  _onAfterRender = (instance: ChatInstance) => {
    this._instance = instance;
    // Force main-window regardless of session state: either the user just
    // clicked our launcher, or we auto-loaded because they were previously in
    // the chat. Gate _chatReady until changeView resolves so the ChatShell
    // overlay doesn't fade before the chat has switched to the main window.
    void instance.changeView(ViewType.MAIN_WINDOW).then(() => {
      this._chatReady = true;
    });
  };

  // Passed to cds-aichat-custom-element to suppress its default behavior of
  // collapsing the container to 0×0 via cds-aichat--hidden (which conflicts
  // with our float CSS animations). We drive all visual state through _phase.
  _onViewChange = (event: BusEventViewChange) => {
    if (event.newViewState.mainWindow) {
      this._hasEverOpened = true;
      this._phase = "opening";
    } else if (this._hasEverOpened) {
      this._phase = "closing";
    }
  };

  _onAnimationEnd = () => {
    if (this._phase === "opening") {
      this._phase = "open";
    } else if (this._phase === "closing") {
      this._phase = "closed";
    }
  };

  _getLauncherClass(): string {
    // Hide the launcher while the float is opening, open, or closing.
    // visibility:hidden (from --hidden) preserves layout so the entrance
    // animation does not replay when the launcher reappears.
    const hidden = this._phase !== "idle" && this._phase !== "closed";
    return hidden
      ? "cds-aichat-launcher cds-aichat-launcher--hidden"
      : "cds-aichat-launcher";
  }

  _getFloatClass(): string {
    switch (this._phase) {
      case "opening":
        // --open supplies position:fixed + dimensions; --opening adds the animation.
        return "cds-aichat-float--open cds-aichat-float--opening";
      case "open":
        return "cds-aichat-float--open";
      case "closing":
        // Keep --open so the widget stays positioned while the close animation plays.
        return "cds-aichat-float--open cds-aichat-float--closing";
      case "closed":
        return "cds-aichat-float--close";
      default:
        return "";
    }
  }

  render() {
    return html`
      <!-- Custom launcher button — rendered immediately so the entrance animation
           plays on first mount. Hidden (not unmounted) when the float is open so
           the animation does not replay when the float closes again. -->
      <cds-aichat-button
        class=${this._getLauncherClass()}
        has-icon-only
        icon-description="Open chat"
        kind="primary"
        size="lg"
        @click=${this._handleLauncherClick}
      >
        ${iconLoader(AiLaunch16, { slot: "icon" })}
      </cds-aichat-button>

      <!-- Not mounted until the launcher is first clicked. Stays mounted after
           that so the lazy bundle is not discarded. -->
      ${this._phase !== "idle"
        ? html`
            ${this._chatLoaded
              ? html`
                  <cds-aichat-custom-element
                    class=${this._getFloatClass()}
                    .messaging=${config.messaging}
                    .launcher=${config.launcher}
                    .onAfterRender=${this._onAfterRender}
                    .onViewChange=${this._onViewChange}
                    @animationend=${this._onAnimationEnd}
                  ></cds-aichat-custom-element>
                `
              : nothing}

            <!-- cds-aichat-shell sits at the same fixed position as cds-aichat-custom-element,
                 covering it during both loading phases. Once onAfterRender fires and changeView
                 resolves, _chatReady flips and the shell fades out then unmounts. -->
            ${!this._chatReady
              ? html`
                  <cds-aichat-shell
                    class="cds-aichat-float--open"
                    show-frame
                    ai-enabled
                    corner-all="round"
                  ></cds-aichat-shell>
                `
              : nothing}
          `
        : nothing}
    `;
  }
}
