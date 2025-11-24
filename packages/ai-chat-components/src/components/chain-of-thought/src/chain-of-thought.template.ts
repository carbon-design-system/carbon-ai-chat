/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../../markdown/index.js";
import "@carbon/web-components/es/components/inline-loading/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import CheckmarkFilled16 from "@carbon/icons/es/checkmark--filled/16.js";
import ChevronRight16 from "@carbon/icons/es/chevron--right/16.js";
import ErrorFilled16 from "@carbon/icons/es/error--filled/16.js";
import { html } from "lit";

import prefix from "../../../globals/settings.js";
import { ChainOfThoughtElement } from "./chain-of-thought.js";
import {
  ChainOfThoughtStepStatus,
  type ChainOfThoughtStepWithToggle,
} from "./types.js";
import { parseUnknownDataToMarkdown } from "./parse-unknown-data-to-markdown.js";

const CSS_CLASS_ITEM_PREFIX = `${prefix}--chain-of-thought-item`;
const CSS_CLASS_STATUS_PREFIX = `${prefix}--chain-of-thought-accordion-item-header-status`;

/**
 * Returns the correct icon given the status of the step. If there is no status, we assume it is successful.
 */
function stepStatus(
  status: ChainOfThoughtStepStatus,
  statusSucceededLabelText: string,
  statusFailedLabelText: string,
  statusProcessingLabelText: string,
) {
  switch (status) {
    case ChainOfThoughtStepStatus.PROCESSING:
      return html`<cds-inline-loading
        status="active"
        aria-label="${statusProcessingLabelText}"
      ></cds-inline-loading>`;
    case ChainOfThoughtStepStatus.FAILURE:
      return html`<span
        class="${CSS_CLASS_STATUS_PREFIX}--${ChainOfThoughtStepStatus.FAILURE}"
        aria-label="${statusFailedLabelText}"
        >${iconLoader(ErrorFilled16)}</span
      >`;
    default:
      return html`<span
        class="${CSS_CLASS_STATUS_PREFIX}--${ChainOfThoughtStepStatus.SUCCESS}"
        aria-label="${statusSucceededLabelText}"
        >${iconLoader(CheckmarkFilled16)}</span
      >`;
  }
}

function renderToolDataAsMarkdown(
  content: string,
  label: string,
  classPostfix: string,
  customElementClass: ChainOfThoughtElement,
) {
  const {
    filterPlaceholderText,
    previousPageText,
    nextPageText,
    itemsPerPageText,
    locale,
    getPaginationSupplementalText,
    getPaginationStatusText,
    feedback,
    showLessText,
    showMoreText,
    tooltipContent,
    getLineCountText,
  } = customElementClass;

  return html`<div
    class="${CSS_CLASS_ITEM_PREFIX} ${CSS_CLASS_ITEM_PREFIX}-${classPostfix}"
  >
    <div class="${CSS_CLASS_ITEM_PREFIX}-label">${label}</div>
    <cds-aichat-markdown
      sanitize-html
      markdown=${content}
      filter-placeholder-text=${filterPlaceholderText}
      previous-page-text=${previousPageText}
      next-page-text=${nextPageText}
      items-per-page-text=${itemsPerPageText}
      locale=${locale}
      .getPaginationSupplementalText=${getPaginationSupplementalText}
      .getPaginationStatusText=${getPaginationStatusText}
      feedback=${feedback}
      show-less-text=${showLessText}
      show-more-text=${showMoreText}
      tooltip-content=${tooltipContent}
      .getLineCountText=${getLineCountText}
    ></cds-aichat-markdown>
  </div>`;
}

/**
 * Takes the input/output data that is unknown and then renders it in the correct format or returns nothing.
 */
function renderToolData(
  data: unknown,
  label: string,
  classPostfix: string,
  customElementClass: ChainOfThoughtElement,
) {
  const content = parseUnknownDataToMarkdown(data);
  if (content) {
    return renderToolDataAsMarkdown(
      content,
      label,
      classPostfix,
      customElementClass,
    );
  }
  return html``;
}

function accordionItemContent(
  customElementClass: ChainOfThoughtElement,
  item: ChainOfThoughtStepWithToggle,
) {
  const {
    inputLabelText,
    outputLabelText,
    toolLabelText,
    filterPlaceholderText,
    previousPageText,
    nextPageText,
    itemsPerPageText,
    locale,
    getPaginationSupplementalText,
    getPaginationStatusText,
    feedback,
    showLessText,
    showMoreText,
    tooltipContent,
    getLineCountText,
  } = customElementClass;

  if (item.open) {
    return html` ${item.description
      ? html`<div
          class="${CSS_CLASS_ITEM_PREFIX} ${CSS_CLASS_ITEM_PREFIX}-description"
        >
          <cds-aichat-markdown
            sanitize-html
            markdown=${item.description}
            filter-placeholder-text=${filterPlaceholderText}
            previous-page-text=${previousPageText}
            next-page-text=${nextPageText}
            items-per-page-text=${itemsPerPageText}
            locale=${locale}
            .getPaginationSupplementalText=${getPaginationSupplementalText}
            .getPaginationStatusText=${getPaginationStatusText}
            feedback=${feedback}
            show-less-text=${showLessText}
            show-more-text=${showMoreText}
            tooltip-content=${tooltipContent}
            .getLineCountText=${getLineCountText}
          ></cds-aichat-markdown>
        </div>`
      : null}
    ${item.tool_name
      ? html`<div
          class="${CSS_CLASS_ITEM_PREFIX} ${CSS_CLASS_ITEM_PREFIX}-toolName"
        >
          <div class="${CSS_CLASS_ITEM_PREFIX}-label">${toolLabelText}</div>
          ${item.tool_name}
        </div>`
      : null}
    ${renderToolData(
      item.request?.args,
      inputLabelText,
      "input",
      customElementClass,
    )}
    ${renderToolData(
      item.response?.content,
      outputLabelText,
      "output",
      customElementClass,
    )}`;
  }
  return html``;
}

function accordionContent(customElementClass: ChainOfThoughtElement) {
  const {
    _steps,
    open,
    _chainOfThoughtPanelID,
    onStepToggle,
    formatStepLabelText,
    statusSucceededLabelText,
    statusFailedLabelText,
    statusProcessingLabelText,
  } = customElementClass;

  if (open) {
    return html`${_steps.map((item, index) => {
      const stepNumber = index + 1;
      const content_id = `${_chainOfThoughtPanelID}-step-${stepNumber}-content`;
      const disabled = !item.description && !item.request && !item.response;
      return html`<div class="${prefix}--chain-of-thought-accordion-item">
        <button
          class="${prefix}--chain-of-thought-accordion-item-header"
          @click=${() => {
            item.open = !item.open;
            customElementClass.requestUpdate();
            const element = customElementClass.shadowRoot?.querySelector(
              `#${content_id}`,
            ) as HTMLElement | null;
            if (element) {
              onStepToggle?.(item.open, element);
            }
          }}
          aria-expanded=${item.open}
          aria-controls=${content_id}
          ?disabled=${disabled}
        >
          <span
            class="${prefix}--chain-of-thought-accordion-item-header-chevron"
            ?data-disabled=${disabled}
            ?data-open=${item.open}
            >${iconLoader(ChevronRight16)}</span
          >
          <span class="${prefix}--chain-of-thought-accordion-item-header-title"
            >${formatStepLabelText({
              stepNumber,
              stepTitle: item.title || item.tool_name || "",
            })}</span
          >
          <span class="${CSS_CLASS_STATUS_PREFIX}"
            >${stepStatus(
              item.status || ChainOfThoughtStepStatus.SUCCESS,
              statusSucceededLabelText,
              statusFailedLabelText,
              statusProcessingLabelText,
            )}</span
          >
        </button>
        <div
          class="${prefix}--chain-of-thought-accordion-item-content"
          id=${content_id}
          ?hidden=${!item.open}
        >
          ${accordionItemContent(customElementClass, item)}
        </div>
      </div>`;
    })}`;
  }

  return html``;
}

function chainOfThoughtElementTemplate(
  customElementClass: ChainOfThoughtElement,
) {
  const { _chainOfThoughtPanelID, explainabilityText, open, onToggle } =
    customElementClass;

  function toggle() {
    customElementClass.open = !customElementClass.open;
    onToggle?.(customElementClass.open, customElementClass);
  }

  return html`<div class="${prefix}--chain-of-thought">
    <button
      class="${prefix}--chain-of-thought-button"
      @click=${toggle}
      aria-expanded=${open}
      aria-controls=${_chainOfThoughtPanelID}
    >
      <span class="${prefix}--chain-of-thought-button-chevron"
        >${iconLoader(ChevronRight16)}</span
      >
      ${explainabilityText}
    </button>
    <div
      id=${_chainOfThoughtPanelID}
      class="${prefix}--chain-of-thought-content"
      ?hidden=${!open}
    >
      <div class="${prefix}--chain-of-thought-inner-content">
        ${accordionContent(customElementClass)}
      </div>
    </div>
  </div>`;
}

export { chainOfThoughtElementTemplate };
