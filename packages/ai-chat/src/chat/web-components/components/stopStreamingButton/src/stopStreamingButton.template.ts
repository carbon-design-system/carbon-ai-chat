/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/icon-button/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import StopFilled16 from "@carbon/icons/es/stop--filled/16.js";
import { html } from "lit";

import { CSS_CLASS_PREFIX } from "../../../settings";
import { StopStreamingButtonElement } from "./StopStreamingButtonElement";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/defs.js";

export function stopStreamingButtonTemplate({
  label,
  disabled,
  tooltipAlignment,
  onClick,
}: StopStreamingButtonElement) {
  return html`
    <cds-icon-button
      class="${CSS_CLASS_PREFIX}-stop-streaming-button"
      align="${tooltipAlignment}"
      kind="${BUTTON_KIND.GHOST}"
      size="${BUTTON_SIZE.SMALL}"
      ?disabled=${disabled}
      @click="${onClick}"
    >
      <span
        class="${disabled ? `${CSS_CLASS_PREFIX}-stop-icon` : ""}"
        slot="icon"
        >${iconLoader(StopFilled16)}</span
      >
      <span slot="tooltip-content">${label}</span>
    </cds-icon-button>
  `;
}
