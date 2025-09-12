/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../../markdownText/cds-aichat-markdown-text";
import "@carbon/web-components/es/components/inline-loading/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import CheckmarkFilled16 from "@carbon/icons/es/checkmark--filled/16.js";
import ChevronRight16 from "@carbon/icons/es/chevron--right/16.js";
import ErrorFilled16 from "@carbon/icons/es/error--filled/16.js";
import { html } from "lit";

import { parseUnknownDataToMarkdown } from "../../../../../utils/lang/stringUtils";
import { prefix } from "../../../settings";
import { ChainOfThoughtElement } from "./ChainOfThoughtElement";
import {
  ChainOfThoughtStep,
  ChainOfThoughtStepStatus,
} from "../../../../../../types/messaging/Messages";

const CSS_CLASS_ITEM_PREFIX = `${prefix}--chain-of-thought-item`;
const CSS_CLASS_STATUS_PREFIX = `${prefix}--chain-of-thought-accordion-item-header-status`;

/**
 * A function to allow the chat component to properly scroll to the element on toggle.
 */
type ChainOfThoughtOnToggle = (
  isOpen: boolean,
  scrollToElement: HTMLElement,
) => void;

interface ChainOfThoughtStepWithToggle extends ChainOfThoughtStep {
  /**
   * If the step is opened.
   */
  open: boolean;
}

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

/**
 * Takes the input/output data that is unknown and then renders it in the correct format or returns nothing.
 */
function renderToolData(data: unknown, label: string, classPostfix: string) {
  // Once we have a Code component instead of just a markdown component, we will need to loop back here.
  const content = parseUnknownDataToMarkdown(data);
  if (content) {
    return renderToolDataAsMarkdown(content, label, classPostfix);
  }
  return html``;
}

function renderToolDataAsMarkdown(
  content: string,
  label: string,
  classPostfix: string,
) {
  return html`<div
    class="${CSS_CLASS_ITEM_PREFIX} ${CSS_CLASS_ITEM_PREFIX}-${classPostfix}"
  >
    <div class="${CSS_CLASS_ITEM_PREFIX}-label">${label}</div>
    <cds-aichat-markdown-text
      sanitize-html
      markdown=${content}
    ></cds-aichat-markdown-text>
  </div>`;
}

function accordionItemContent(
  customElementClass: ChainOfThoughtElement,
  item: ChainOfThoughtStepWithToggle,
) {
  const { inputLabelText, outputLabelText, toolLabelText } = customElementClass;
  if (item.open) {
    return html` ${item.description
      ? html`<div
          class="${CSS_CLASS_ITEM_PREFIX} ${CSS_CLASS_ITEM_PREFIX}-description"
        >
          <cds-aichat-markdown-text
            sanitize-html
            markdown=${item.description}
          ></cds-aichat-markdown-text>
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
    ${renderToolData(item.request?.args, inputLabelText, "input")}
    ${renderToolData(item.response?.content, outputLabelText, "output")}`;
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
      return html`<div class="${prefix}--chain-of-thought-accordion-item">
        <button
          class="${prefix}--chain-of-thought-accordion-item-header"
          @click=${() => {
            item.open = !item.open;
            customElementClass.requestUpdate();
            // This was an unfortunate discovery after refactoring.
            // I need to move the accordionItemContent back out into its own component for two reasons:
            // 1. The next line and not being able to create a ref here.
            // 2. We really should allow someone to pass in a custom template for this.
            const element: HTMLElement =
              customElementClass.shadowRoot.querySelector(`#${content_id}`);
            onStepToggle?.(item.open, element);
          }}
          aria-expanded=${item.open}
          aria-controls=${content_id}
        >
          <span
            class="${prefix}--chain-of-thought-accordion-item-header-chevron"
            ?data-open=${item.open}
            >${iconLoader(ChevronRight16)}</span
          >
          <span class="${prefix}--chain-of-thought-accordion-item-header-title"
            >${formatStepLabelText({ stepNumber, stepTitle: item.title })}</span
          >
          <span class="${CSS_CLASS_STATUS_PREFIX}"
            >${stepStatus(
              item.status,
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
  const { _chainOfThoughtPanelID, explainabilityText, open } =
    customElementClass;

  /**
   * Function called when someone clicks on the button to toggle if chain of thought is open or closed.
   */
  function toggle() {
    customElementClass.open = !customElementClass.open;
    customElementClass.onToggle?.(customElementClass.open, customElementClass);
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

export {
  chainOfThoughtElementTemplate,
  ChainOfThoughtOnToggle,
  ChainOfThoughtStepWithToggle,
};
