/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/textarea/index.js";
import "@carbon/web-components/es-custom/components/icon-button/index.js";

import { toString } from "@carbon/icon-helpers";
import ThumbsDown16 from "@carbon/icons/es/thumbs-down/16.js";
import ThumbsDownFilled16 from "@carbon/icons/es/thumbs-down--filled/16.js";
import ThumbsUp16 from "@carbon/icons/es/thumbs-up/16.js";
import ThumbsUpFilled16 from "@carbon/icons/es/thumbs-up--filled/16.js";
import { html, nothing } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";

import { CSS_CLASS_PREFIX } from "../../../settings";
import { FeedbackButtonsElement } from "./FeedbackButtonsElement.js";
import { enLanguagePack } from "../../../../../types/instance/apiTypes";

const ThumbsDown16svg = toString(ThumbsDown16);
const ThumbsDownFilled16svg = toString(ThumbsDownFilled16);
const ThumbsUp16svg = toString(ThumbsUp16);
const ThumbsUpFilled16svg = toString(ThumbsUpFilled16);

function feedbackButtonsElementTemplate(
  customElementClass: FeedbackButtonsElement
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

  return html`<div class="${CSS_CLASS_PREFIX}-feedback-buttons">
    <cds-custom-icon-button
      class="${CSS_CLASS_PREFIX}-feedback-buttons-positive"
      size="sm"
      align="top-left"
      kind="ghost"
      role="button"
      disabled="${isPositiveDisabled || nothing}"
      aria-expanded="${isPositiveDisabled || !hasPositiveDetails
        ? (nothing as any)
        : isPositiveOpen}"
      aria-pressed="${isPositiveSelected || (nothing as any)}"
      aria-controls="${panelID}-feedback-positive"
      @click="${() => onClick(true)}"
    >
      <span slot="icon"
        >${unsafeSVG(
          isPositiveSelected ? ThumbsUpFilled16svg : ThumbsUp16svg
        )}</span
      >
      <span slot="tooltip-content"
        >${positiveLabel || enLanguagePack.feedback_positiveLabel}</span
      >
    </cds-custom-icon-button>
    <cds-custom-icon-button
      class="${CSS_CLASS_PREFIX}-feedback-buttons-negative"
      size="sm"
      align="top-left"
      kind="ghost"
      role="button"
      disabled="${isNegativeDisabled || nothing}"
      aria-expanded="${isNegativeDisabled || !hasNegativeDetails
        ? (nothing as any)
        : isNegativeOpen}"
      aria-pressed="${isNegativeSelected || (nothing as unknown as any)}"
      aria-controls="${panelID}-feedback-positive"
      @click="${() => onClick(false)}"
    >
      <span slot="icon"
        >${unsafeSVG(
          isNegativeSelected ? ThumbsDownFilled16svg : ThumbsDown16svg
        )}</span
      >
      <span slot="tooltip-content"
        >${negativeLabel || enLanguagePack.feedback_negativeLabel}</span
      >
    </cds-custom-icon-button>
  </div>`;
}

export { feedbackButtonsElementTemplate };
