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

@carbonElement("cds-aichat-chain-of-thought")
class CDSAIChatChainOfThought extends LitElement {
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
  /** Placeholder text for table filters inside markdown content. */
  @property({ type: String, attribute: "filter-placeholder-text" })
  filterPlaceholderText = "Filter table...";

  /** Label for the previous page control inside markdown tables. */
  @property({ type: String, attribute: "previous-page-text" })
  previousPageText = "Previous page";

  /** Label for the next page control inside markdown tables. */
  @property({ type: String, attribute: "next-page-text" })
  nextPageText = "Next page";

  /** Label for the items-per-page control inside markdown tables. */
  @property({ type: String, attribute: "items-per-page-text" })
  itemsPerPageText = "Items per page:";

  /** Locale forwarded to markdown rendering (tables, formatting). */
  @property({ type: String, attribute: "locale" })
  locale = "en";

  /** Optional formatter for supplemental pagination text in markdown tables. */
  @property({ type: Object, attribute: false })
  getPaginationSupplementalText?: ({ count }: { count: number }) => string;

  /** Optional formatter for pagination status text in markdown tables. */
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
  /** Feedback text displayed after copying from markdown code blocks. */
  @property({ type: String, attribute: "feedback" })
  feedback = "Copied!";

  /** Label for collapsing long markdown code blocks. */
  @property({ type: String, attribute: "show-less-text" })
  showLessText = "Show less";

  /** Label for expanding long markdown code blocks. */
  @property({ type: String, attribute: "show-more-text" })
  showMoreText = "Show more";

  /** Tooltip content for the copy button in markdown code blocks. */
  @property({ type: String, attribute: "tooltip-content" })
  tooltipContent = "Copy code";

  /** Formatter for line count text in markdown code blocks. */
  @property({ type: Object, attribute: false })
  getLineCountText?: ({ count }: { count: number }) => string;

  /**
   * Steps, but we add in whether the step is open or not.
   *
   * @internal
   */
  @state()
  _steps: ChainOfThoughtStepWithToggle[] = [];

  /**
   * ID we use for a11y.
   * @internal
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
    this.addEventListener(
      CDSAIChatChainOfThought.stepToggleEventName,
      this.handleStepToggle as EventListener,
    );
    super.connectedCallback();
  }

  disconnectedCallback() {
    this.removeEventListener(
      CDSAIChatChainOfThought.stepToggleEventName,
      this.handleStepToggle as EventListener,
    );
    super.disconnectedCallback();
  }

  get steps(): NodeListOf<CDSAIChatChainOfThoughtStep> {
    return this.querySelectorAll<CDSAIChatChainOfThoughtStep>(stepSelector);
  }

  protected updated(changedProperties: Map<PropertyKey, unknown>) {
    if (changedProperties.has("controlled")) {
      this.propagateControlled();
    }

    if (
      changedProperties.has("open") &&
      changedProperties.get("open") !== undefined
    ) {
      this.dispatchToggleEvent();
    }
  }

  private handleStepToggle(
    event: CustomEvent<ChainOfThoughtStepToggleEventDetail>,
  ) {
    const { detail, target } = event;
    this.onStepToggle?.(Boolean(detail?.open), target as HTMLElement);
  }

  private propagateControlled() {
    this.steps.forEach((step) => {
      if (this.controlled) {
        step.setAttribute("data-parent-controlled", "");
        step.setAttribute("controlled", "");
      } else if (step.hasAttribute("data-parent-controlled")) {
        step.removeAttribute("data-parent-controlled");
        step.removeAttribute("controlled");
      }
    });
  }

  private dispatchToggleEvent() {
    const detail: ChainOfThoughtToggleEventDetail = {
      open: this.open,
      panelId: this.panelId,
    };
    this.dispatchEvent(
      new CustomEvent<ChainOfThoughtToggleEventDetail>(
        CDSAIChatChainOfThought.eventToggle,
        {
          detail,
          bubbles: true,
          composed: true,
        },
      ),
    );

    const panel = this.shadowRoot?.getElementById(this.panelId) ?? this;
    this.onToggle?.(this.open, panel as HTMLElement);
  }

  render() {
    return html`
      <div class="${prefix}--chain-of-thought">
        <div
          id=${this.panelId}
          class="${prefix}--chain-of-thought-content"
          aria-hidden=${this.open ? "false" : "true"}
          ?hidden=${!this.open}
        >
          <div class="${prefix}--chain-of-thought-inner-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `;
  }

  static get eventToggle() {
    return `${prefix}-chain-of-thought-toggled`;
  }

  static get stepToggleEventName() {
    return `${prefix}-chain-of-thought-step-toggled`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-chain-of-thought": CDSAIChatChainOfThought;
  }
}

export { CDSAIChatChainOfThought };
export default CDSAIChatChainOfThought;
