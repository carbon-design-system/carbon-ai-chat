/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ChevronDown16 from "@carbon/icons/es/chevron--down/16.js";

import prefix from "../../../globals/settings.js";
import { CDSAIChatReasoningStepsToggle } from "./reasoning-steps-toggle.js";

function reasoningStepsToggleTemplate(
  customElementClass: CDSAIChatReasoningStepsToggle,
) {
  const {
    open,
    disabled,
    panelID,
    handleToggleClick,
    openLabelText,
    closedLabelText,
  } = customElementClass;

  const labelText = open ? openLabelText : closedLabelText;

  return html`
    <button
      class="${prefix}--reasoning-steps-toggle"
      type="button"
      aria-expanded=${open ? "true" : "false"}
      aria-controls=${ifDefined(panelID)}
      ?disabled=${disabled}
      @click=${handleToggleClick}
    >
      <span class="${prefix}--reasoning-steps-toggle-label">${labelText}</span>
      <span class="${prefix}--reasoning-steps-toggle-caret" aria-hidden="true">
        ${iconLoader(ChevronDown16)}
      </span>
    </button>
  `;
}

export { reasoningStepsToggleTemplate };
