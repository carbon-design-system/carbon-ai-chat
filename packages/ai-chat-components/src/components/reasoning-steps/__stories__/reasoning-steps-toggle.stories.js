/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/reasoning-steps-toggle";
import "../src/reasoning-steps";
import "../src/reasoning-step";
import "../../markdown/src/markdown";
import { LitElement, css, html, nothing } from "lit";

const defaultSteps = [
  {
    title: "Gather context",
    body: html`<cds-aichat-markdown>
      Collected relevant conversation turns and system guidance.
    </cds-aichat-markdown>`,
  },
  {
    title: "Plan response",
    body: html`<cds-aichat-markdown>
      Outlined the answer structure before generating the final reply.
    </cds-aichat-markdown>`,
  },
  {
    title: "Validate output",
    body: html`<cds-aichat-markdown>
      Checked tone, safety, and citation coverage before sending.
    </cds-aichat-markdown>`,
  },
];

class ReasoningStepsToggleDemo extends LitElement {
  static properties = {
    open: { type: Boolean, reflect: true },
    openLabelText: { type: String, attribute: "open-label-text" },
    closedLabelText: { type: String, attribute: "closed-label-text" },
    panelId: { type: String, attribute: "panel-id" },
    steps: { type: Array },
  };

  static styles = css`
    :host {
      display: block;
    }

    .demo {
      display: flex;
      flex-direction: column;
      gap: 0.75rem;
      max-inline-size: 48rem;
    }
  `;

  constructor() {
    super();
    this.open = true;
    this.openLabelText = "Hide reasoning steps";
    this.closedLabelText = "Show reasoning steps";
    this.panelId = "reasoning-steps-toggle-demo";
    this.steps = defaultSteps;
  }

  render() {
    return html`
      <div class="demo">
        <cds-aichat-reasoning-steps-toggle
          .open=${this.open}
          panel-id=${this.panelId}
          .openLabelText=${this.openLabelText}
          .closedLabelText=${this.closedLabelText}
          @reasoning-steps-toggle=${this._handleToggle}
        ></cds-aichat-reasoning-steps-toggle>
        ${this.open
          ? html`
              <cds-aichat-reasoning-steps id=${this.panelId} .open=${this.open}>
                ${this.steps?.map(
                  (step) => html`
                    <cds-aichat-reasoning-step
                      title=${step.title}
                      ?open=${step.open}
                    >
                      ${step.body ?? nothing}
                    </cds-aichat-reasoning-step>
                  `,
                )}
              </cds-aichat-reasoning-steps>
            `
          : nothing}
      </div>
    `;
  }

  _handleToggle = (event) => {
    this.open = event.detail?.open ?? !this.open;
  };
}

if (!customElements.get("cds-aichat-reasoning-steps-toggle-demo")) {
  customElements.define(
    "cds-aichat-reasoning-steps-toggle-demo",
    ReasoningStepsToggleDemo,
  );
}

export default {
  title: "Components/Reasoning steps/Toggle",
  component: "cds-aichat-reasoning-steps-toggle",
  parameters: {
    docs: {
      description: {
        component:
          "A dedicated toggle button for expanding or collapsing reasoning steps. Compose it with `cds-aichat-reasoning-steps` when you want to manage the open state externally.",
      },
    },
  },
  argTypes: {
    openLabelText: {
      control: "text",
      description: "Label shown when the wrapper is open.",
    },
    closedLabelText: {
      control: "text",
      description: "Label shown when the wrapper is closed.",
    },
    panelId: {
      control: "text",
      description:
        "ID of the reasoning steps wrapper used for accessibility bindings.",
    },
    open: {
      control: "boolean",
      description: "Whether the wrapper is expanded.",
    },
    steps: {
      control: "object",
      description:
        "Reasoning steps passed to the wrapper (used in the demo composition).",
    },
  },
};

export const Default = {
  args: {
    openLabelText: "Hide reasoning steps",
    closedLabelText: "Show reasoning steps",
    panelId: "reasoning-steps-toggle-demo",
    open: true,
    steps: defaultSteps,
  },
  render: (args) => html`
    <cds-aichat-reasoning-steps-toggle-demo
      open-label-text=${args.openLabelText}
      closed-label-text=${args.closedLabelText}
      panel-id=${args.panelId}
      .open=${args.open}
      .steps=${args.steps}
    ></cds-aichat-reasoning-steps-toggle-demo>
  `,
};
