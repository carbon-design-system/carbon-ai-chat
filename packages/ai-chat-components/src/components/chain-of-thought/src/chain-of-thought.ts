/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { LitElement, PropertyValues } from "lit";
import { property, state } from "lit/decorators.js";
// @ts-ignore
import styles from "./chain-of-thought.scss?lit";
import {
  type ChainOfThoughtOnToggle,
  type ChainOfThoughtStep,
  type ChainOfThoughtStepWithToggle,
} from "./types.js";
import prefix from "../../../globals/settings.js";
import { uuid } from "../../../globals/utils/uuid.js";

const numberFormatter = new Intl.NumberFormat("en-US");

const formatStepLabelTextDefault = ({
  stepNumber,
  stepTitle,
}: {
  stepNumber: number;
  stepTitle: string;
}) => {
  const formattedNumber = numberFormatter.format(stepNumber);
  const formattedTitle = stepTitle || "";
  return `${formattedNumber}: ${formattedTitle}`;
};

class ChainOfThoughtElement extends LitElement {
  static styles = styles;

  /**
   * Indicates if the details panel for the chain of thought is open.
   */
  @property({ type: Boolean, attribute: "open", reflect: true })
  open = false;

  /**
   * Array of steps in the chain of thought.
   */
  @property({ type: Array, attribute: "steps", reflect: true })
  steps: ChainOfThoughtStep[] = [];

  /**
   * Formatting for label of each step item.
   */
  @property({ type: Function, attribute: false })
  formatStepLabelText: ({
    stepNumber,
    stepTitle,
  }: {
    stepNumber: number;
    stepTitle: string;
  }) => string = formatStepLabelTextDefault;

  /**
   * Text string used to label step input.
   */
  @property({ type: String, attribute: "input-label-text", reflect: true })
  inputLabelText = "Input";

  /**
   * Text string used to label step output.
   */
  @property({ type: String, attribute: "output-label-text", reflect: true })
  outputLabelText = "Output";

  /**
   * Text string used to label the tool.
   */
  @property({ type: String, attribute: "tool-label-text", reflect: true })
  toolLabelText = "Tool";

  /**
   * Text string used to label the button to open the chain of thought panel.
   */
  @property({ type: String, attribute: "explainability-text", reflect: true })
  explainabilityText = "Show chain of thought";

  /**
   * Optional function to call if chain of thought visibility is toggled.
   */
  @property({ type: Function, attribute: false })
  onToggle?: ChainOfThoughtOnToggle;

  /**
   * Optional function to call if a chain of thought step visibility is toggled.
   */
  @property({ type: Function, attribute: false })
  onStepToggle?: ChainOfThoughtOnToggle;

  /**
   * Text string used to label the succeeded status icon.
   */
  @property({
    type: String,
    attribute: "status-succeeded-label-text",
    reflect: true,
  })
  statusSucceededLabelText = "Succeeded";

  /**
   * Text string used to label the failed status icon.
   */
  @property({
    type: String,
    attribute: "status-failed-label-text",
    reflect: true,
  })
  statusFailedLabelText = "Failed";

  /**
   * Text string used to label the processing status icon.
   */
  @property({
    type: String,
    attribute: "status-processing-label-text",
    reflect: true,
  })
  statusProcessingLabelText = "Processing";

  // Markdown component strings - Table
  @property({ type: String, attribute: "filter-placeholder-text" })
  filterPlaceholderText?: string;

  @property({ type: String, attribute: "previous-page-text" })
  previousPageText?: string;

  @property({ type: String, attribute: "next-page-text" })
  nextPageText?: string;

  @property({ type: String, attribute: "items-per-page-text" })
  itemsPerPageText?: string;

  @property({ type: String, attribute: "locale" })
  locale?: string;

  @property({ type: Object, attribute: false })
  getPaginationSupplementalText?: ({ count }: { count: number }) => string;

  @property({ type: Object, attribute: false })
  getPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;

  // Markdown component strings - Code snippet
  @property({ type: String, attribute: "feedback" })
  feedback?: string;

  @property({ type: String, attribute: "show-less-text" })
  showLessText?: string;

  @property({ type: String, attribute: "show-more-text" })
  showMoreText?: string;

  @property({ type: String, attribute: "tooltip-content" })
  tooltipContent?: string;

  @property({ type: Object, attribute: false })
  getLineCountText?: ({ count }: { count: number }) => string;

  /**
   * Steps, but we add in whether the step is open or not.
   */
  @state()
  _steps: ChainOfThoughtStepWithToggle[] = [];

  /**
   * ID we use for a11y.
   */
  @state()
  _chainOfThoughtPanelID = `${prefix}-chain-of-thought-panel-id-${uuid()}`;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    const steps = this.steps ?? [];
    this._steps = steps.map((item) => ({ ...item, open: false }));
  }

  protected updated(changedProperties: PropertyValues<this>): void {
    if (changedProperties.has("steps")) {
      const incomingSteps = this.steps ?? [];
      const currentSteps = this._steps ?? [];
      this._steps = incomingSteps.map((item, index) => ({
        ...item,
        open: currentSteps[index]?.open ?? false,
      }));
    }
  }
}

export { ChainOfThoughtElement };
