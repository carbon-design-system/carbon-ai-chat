/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — Custom element as float (Web components)
 *
 * Demonstrates: replicating the built-in float / launcher view using
 * `<cds-aichat-custom-element>` styled with the shipped float-layout CSS
 * plus a `<cds-aichat-button>` custom launcher controlled via
 * `VIEW_CHANGE`. Useful when you need full control over launcher
 * behavior, accessibility, or positioning.
 *
 * APIs exercised:
 *   - `<cds-aichat-custom-element>` styled with float-layout + launcher CSS
 *   - `<cds-aichat-button>` (custom launcher)
 *   - `BusEventType.VIEW_CHANGE` for the open/closed phase machine
 *   - `PublicConfig.launcher.isOn` (disabled to use a custom launcher)
 *
 * Start reading at: the `Demo` element below and the `VIEW_CHANGE` handler.
 */

import "@carbon/ai-chat/css/chat-float-layout.css";
import "@carbon/ai-chat/css/chat-launcher-layout.css";
import "@carbon/ai-chat/dist/es/web-components/cds-aichat-custom-element/index.js";
import "@carbon/ai-chat-components/es/components/chat-button/index.js";

import {
  type BusEventViewChange,
  type ChatInstance,
  type PublicConfig,
  ViewType,
} from "@carbon/ai-chat";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import AiLaunch16 from "@carbon/icons/es/ai-launch/16.js";
import { LitElement, html, nothing } from "lit";
import { customElement, state } from "lit/decorators.js";

import { customSendMessage } from "./customSendMessage";

type FloatPhase = "idle" | "opening" | "open" | "closing" | "closed";

const config: PublicConfig = {
  messaging: {
    // Route every outbound message through a local mock so the example runs
    // with no back-end. Replace with a real production implementation.
    customSendMessage,
  },
  // Suppress the built-in launcher — our custom cds-aichat-button acts as the launcher.
  launcher: { isOn: false },
};

@customElement("my-app")
export class Demo extends LitElement {
  // Disable shadow DOM so float layout CSS from the imported stylesheets applies
  // to the cds-aichat-custom-element and cds-aichat-button host elements.
  createRenderRoot() {
    return this;
  }

  @state()
  accessor _phase: FloatPhase = "idle";

  // The launcher is not shown until onAfterRender fires, so _instance is always
  // set before _handleLauncherClick can be called.
  @state()
  accessor _chatReady = false;

  private _instance: ChatInstance | null = null;

  // Guards against the initial VIEW_CHANGE(mainWindow: false) that fires during
  // chat boot — we only trigger the closing animation after the chat has opened.
  private _hasEverOpened = false;

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

  _onAfterRender = (instance: ChatInstance) => {
    // Cache the ChatInstance so the custom launcher can call changeView, and
    // flip _chatReady to render the launcher only after the chat has finished
    // its first render — this guarantees changeView is callable on click.
    this._instance = instance;
    this._chatReady = true;
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
    // Advance the phase machine when the float-layout CSS transition finishes;
    // moving out of "opening"/"closing" drops the animation class so the next
    // open/close cycle replays the animation cleanly.
    if (this._phase === "opening") {
      this._phase = "open";
    } else if (this._phase === "closing") {
      this._phase = "closed";
    }
  };

  _handleLauncherClick = () => {
    // The non-null assertion is safe because the launcher only renders after
    // _chatReady flips true in _onAfterRender, which assigns _instance.
    void this._instance!.changeView(ViewType.MAIN_WINDOW);
  };

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
      case "idle":
      case "closed":
      default:
        return "cds-aichat-float--close";
    }
  }

  _getLauncherClass(): string {
    // Hide the launcher while the float is opening, open, or closing.
    // visibility:hidden (from --hidden) preserves layout so the entrance
    // animation does not replay when the launcher reappears.
    const hidden = this._phase !== "idle" && this._phase !== "closed";
    return hidden
      ? "cds-aichat-launcher cds-aichat-launcher--hidden"
      : "cds-aichat-launcher";
  }

  render() {
    return html`
      <!-- cds-aichat-custom-element renders immediately and begins initializing.
           The float container is hidden (cds-aichat-float--close) until the
           user first opens it. _onViewChange drives phase transitions and
           suppresses the default cds-aichat--hidden behavior. -->
      <cds-aichat-custom-element
        class=${this._getFloatClass()}
        .messaging=${config.messaging}
        .launcher=${config.launcher}
        .onAfterRender=${this._onAfterRender}
        .onViewChange=${this._onViewChange}
        @animationend=${this._onAnimationEnd}
      ></cds-aichat-custom-element>

      <!-- Launcher is not rendered until onAfterRender fires, guaranteeing
           _instance is set before _handleLauncherClick can be called. -->
      ${this._chatReady
        ? html`
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
          `
        : nothing}
    `;
  }
}
