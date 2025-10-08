/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/textarea/index.js";
import "@carbon/web-components/es/components/icon-button/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import ThumbsDown16 from "@carbon/icons/es/thumbs-down/16.js";
import ThumbsDownFilled16 from "@carbon/icons/es/thumbs-down--filled/16.js";
import ThumbsUp16 from "@carbon/icons/es/thumbs-up/16.js";
import ThumbsUpFilled16 from "@carbon/icons/es/thumbs-up--filled/16.js";
import { html, nothing } from "lit";

import { prefix } from "../../../settings";
import { FeedbackButtonsElement } from "./FeedbackButtonsElement.js";
import { enLanguagePack } from "../../../../../../types/config/PublicConfig";

function feedbackButtonsElementTemplate(
  customElementClass: FeedbackButtonsElement,
) {
  const {
    isPositiveOpen,
    isNegativeOpen,
    isPositiveSelected,
    isNegativeSelected,
    hasPositiveDetails,
    hasNegativeDetails,
    isPositiveDisabled,
    isNegativeDisabled,
    positiveLabel,
    negativeLabel,
    panelID,
    onClick,
  } = customElementClass;

  return html`<div class="${prefix}--feedback-buttons">
    <cds-icon-button
      class="${prefix}--feedback-buttons-positive"
      size="sm"
      align="top-left"
      kind="ghost"
      role="button"
      disabled="${isPositiveDisabled || nothing}"
      aria-expanded="${isPositiveDisabled || !hasPositiveDetails
        ? nothing
        : isPositiveOpen}"
      aria-pressed="${isPositiveSelected || nothing}"
      aria-controls="${panelID}-feedback-positive"
      @click="${() => onClick(true)}"
    >
      <span slot="icon"
        >${iconLoader(isPositiveSelected ? ThumbsUpFilled16 : ThumbsUp16)}</span
      >
      <span slot="tooltip-content"
        >${positiveLabel || enLanguagePack.feedback_positiveLabel}</span
      >
    </cds-icon-button>
    <cds-icon-button
      class="${prefix}--feedback-buttons-negative"
      size="sm"
      align="top-left"
      kind="ghost"
      role="button"
      disabled="${isNegativeDisabled || nothing}"
      aria-expanded="${isNegativeDisabled || !hasNegativeDetails
        ? nothing
        : isNegativeOpen}"
      aria-pressed="${isNegativeSelected || nothing}"
      aria-controls="${panelID}-feedback-positive"
      @click="${() => onClick(false)}"
    >
      <span slot="icon"
        >${iconLoader(
          isNegativeSelected ? ThumbsDownFilled16 : ThumbsDown16,
        )}</span
      >
      <span slot="tooltip-content"
        >${negativeLabel || enLanguagePack.feedback_negativeLabel}</span
      >
    </cds-icon-button>
  </div>`;
}

export { feedbackButtonsElementTemplate };
