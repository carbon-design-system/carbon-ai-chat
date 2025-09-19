/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { css, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import { uuid } from "../../../../../utils/lang/uuid";
import { prefix } from "../../../settings";
import styles from "./chainOfThoughtElement.scss";
import {
  ChainOfThoughtOnToggle,
  ChainOfThoughtStepWithToggle,
} from "./chainOfThoughtElement.template";
import { createEnglishFormat } from "../../../../../utils/languages";
import { ChainOfThoughtStep } from "../../../../../../types/messaging/Messages";
import { enLanguagePack } from "../../../../../../types/config/PublicConfig";

const stepTitleFormatter = createEnglishFormat("chainOfThought_stepTitle");

class ChainOfThoughtElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Indicates if the details panel for the chain of thought is open.
   */
  @property({ type: Boolean, attribute: "open", reflect: true })
  open = false;

  /**
   * Array of steps in the chain of thought.
   */
  @property({ type: Array, attribute: "steps", reflect: true })
  steps: ChainOfThoughtStep[];

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
  }) => string = ({ stepNumber, stepTitle }) =>
    stepTitleFormatter.format({
      stepNumber,
      stepTitle: stepTitle || "",
    }) as string;

  /**
   * Text string used to label step input.
   */
  @property({ type: String, attribute: "input-label-text", reflect: true })
  inputLabelText = enLanguagePack.chainOfThought_inputLabel;

  /**
   * Text string used to label step output.
   */
  @property({ type: String, attribute: "output-label-text", reflect: true })
  outputLabelText = enLanguagePack.chainOfThought_outputLabel;

  /**
   * Text string used to label the tool.
   */
  @property({ type: String, attribute: "tool-label-text", reflect: true })
  toolLabelText = enLanguagePack.chainOfThought_toolLabel;

  /**
   * Text string used to label the button to open the chain of thought panel.
   */
  @property({ type: String, attribute: "explainability-text", reflect: true })
  explainabilityText = enLanguagePack.chainOfThought_explainabilityLabel;

  /**
   * Optional function to call if chain of thought visibility is toggled.
   */
  @property({ type: Function, attribute: false })
  onToggle: ChainOfThoughtOnToggle;

  /**
   * Optional function to call if a chain of thought step visibility is toggled.
   */
  @property({ type: Function, attribute: false })
  onStepToggle: ChainOfThoughtOnToggle;

  /**
   * Text string used to label the succeeded status icon.
   */
  @property({
    type: String,
    attribute: "status-succeeded-label-text",
    reflect: true,
  })
  statusSucceededLabelText = enLanguagePack.chainOfThought_statusSucceededLabel;

  /**
   * Text string used to label the failed status icon.
   */
  @property({
    type: String,
    attribute: "status-failed-label-text",
    reflect: true,
  })
  statusFailedLabelText = enLanguagePack.chainOfThought_statusFailedLabel;

  /**
   * Text string used to label the processing status icon.
   */
  @property({
    type: String,
    attribute: "status-processing-label-text",
    reflect: true,
  })
  statusProcessingLabelText =
    enLanguagePack.chainOfThought_statusProcessingLabel;

  /**
   * Steps, but we add in whether the step is open or not.
   */
  @state()
  _steps: ChainOfThoughtStepWithToggle[];

  /**
   * ID we use for a11y.
   */
  @state()
  _chainOfThoughtPanelID = `${prefix}-chain-of-thought-panel-id-${uuid()}`;

  protected firstUpdated(_changedProperties: PropertyValues): void {
    // Update the steps saying they are all closed.
    this._steps = this.steps.map((item) => ({ ...item, open: false }));
  }

  protected updated(_changedProperties: PropertyValues): void {
    if (_changedProperties.has("steps")) {
      // Update the steps with current open status.
      this._steps = this.steps.map((item, index) => ({
        ...item,
        open: this._steps[index]?.open,
      }));
    }
  }
}

export { ChainOfThoughtElement };
