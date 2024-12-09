/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import { PublicConfig } from "@carbon/ai-chat";
import { css, html, LitElement, PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import React from "react";
import { createRoot, Root } from "react-dom/client";

import { DemoApp } from "../react/DemoApp";
import { Settings } from "./types";
import { getSettings } from "./utils";

const { defaultConfig, defaultSettings } = getSettings();

/**
 * `DemoBody` is a custom Lit element representing the body component.
 */
@customElement("demo-body")
export class DemoBody extends LitElement {
  static styles = css`
    :host {
      display: block;
      height: calc(100vh - 48px);
      width: 100%;
      margin-top: 48px;
      background: var(--cds-layer);
    }

    .page {
      display: flex;
      gap: 1rem;
    }

    .nav-block {
      flex-basis: 320px;
      padding: 1rem;
    }

    .main {
      flex-grow: 1;
    }

    demo-version-switcher,
    demo-layout-switcher,
    demo-theme-switcher,
    demo-homescreen-switcher,
    demo-writeable-elements-switcher {
      display: block;
    }

    demo-layout-switcher,
    demo-theme-switcher,
    demo-homescreen-switcher,
    demo-writeable-elements-switcher {
      padding-top: 1rem;
    }
  `;

  @state()
  accessor settings: Settings = defaultSettings;

  @state()
  accessor config: PublicConfig = defaultConfig;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    if (this.settings.framework === "react") {
      this._renderReactApp();
    }
  }

  /**
   * Track if a previous React 18 root was already created so we don't create a memory leak on re-renders.
   */
  _root!: Root;

  private _renderReactApp() {
    const container: HTMLElement = document.querySelector(
      "#root"
    ) as HTMLElement;
    // If a root already exists, unmount it to avoid memory leaks
    if (this._root) {
      this._root.unmount();
    }
    this._root = createRoot(container);
    this._root.render(
      <DemoApp config={this.config} settings={this.settings} />
    );
  }

  // Define the element's render template
  render() {
    return html`<cds-layer
      ><div class="page">
        <div class="nav-block">
          <cds-layer level="1">
            <demo-version-switcher
              .settings=${this.settings}
            ></demo-version-switcher>
            <demo-layout-switcher
              .settings=${this.settings}
            ></demo-layout-switcher>
            <demo-theme-switcher .config=${this.config}></demo-theme-switcher>
            <demo-homescreen-switcher
              .settings=${this.settings}
            ></demo-homescreen-switcher>
            <demo-writeable-elements-switcher
              .settings=${this.settings}
            ></demo-writeable-elements-switcher>
          </cds-layer>
        </div>
        <div class="main">
          ${this.settings.framework === "web-component"
            ? html`<demo-app
                .config=${this.config}
                .settings=${this.settings}
              />`
            : html``}
        </div>
      </div></cds-layer
    >`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-body": DemoBody;
  }
}
