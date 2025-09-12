/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/ui-shell/index.js";
import "@carbon/web-components/es/components/layer/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";
import "@carbon/web-components/es/components/accordion/index.js";
import "./framework/demo-body";
import "./framework/demo-header";
import "./framework/demo-version-switcher";
import "./framework/demo-layout-switcher";
import "./framework/demo-homescreen-switcher";
import "./framework/demo-theme-switcher";
import "./framework/demo-page-theme-switcher";
import "./framework/demo-side-bar-nav";
import "./framework/demo-writeable-elements-switcher";
import "./web-components/demo-app";

import { PublicConfig } from "@carbon/ai-chat";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";

import { Settings } from "./framework/types";
import { getSettings } from "./framework/utils";

const { defaultConfig, defaultSettings } = getSettings();

@customElement("demo-container")
export class Demo extends LitElement {
  @state()
  accessor settings: Settings = defaultSettings;

  @state()
  accessor config: PublicConfig = defaultConfig;

  render() {
    return html`<slot name="demo-header"></slot>
      <slot name="demo-body"></slot>`;
  }
}

// Register the custom element if not already defined
declare global {
  interface HTMLElementTagNameMap {
    "demo-container": Demo;
  }
}
