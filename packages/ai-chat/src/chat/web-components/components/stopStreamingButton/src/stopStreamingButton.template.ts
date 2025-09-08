/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/icon-button/index.js";

import { toString } from "@carbon/icon-helpers";
import StopFilled16 from "@carbon/icons/es/stop--filled/16.js";
import { html } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

import { CSS_CLASS_PREFIX } from "../../../settings";
import { StopStreamingButtonElement } from "./StopStreamingButtonElement";
import {
  ButtonKindEnum,
  ButtonSizeEnum,
} from "../../../../../types/utilities/carbonTypes";

const StopFilled16svg = toString(StopFilled16);

export function stopStreamingButtonTemplate({
  label,
  disabled,
  tooltipAlignment,
  onClick,
}: StopStreamingButtonElement) {
  return html`
    <cds-custom-icon-button
      class="${CSS_CLASS_PREFIX}-stop-streaming-button"
      align="${tooltipAlignment}"
      kind="${ButtonKindEnum.GHOST}"
      size="${ButtonSizeEnum.SMALL}"
      ?disabled=${disabled}
      @click="${onClick}"
    >
      <span slot="icon">
        <span
          class="${CSS_CLASS_PREFIX}-stop-icon ${disabled
            ? "${CSS_CLASS_PREFIX}-stop-icon--disabled"
            : ""}"
          >${unsafeSVG(StopFilled16svg)}</span
        >
      </span>
      <span slot="tooltip-content">${label}</span>
    </cds-custom-icon-button>
  `;
}
