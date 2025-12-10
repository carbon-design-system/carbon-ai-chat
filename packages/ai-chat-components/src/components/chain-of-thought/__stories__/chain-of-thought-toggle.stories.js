/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/chain-of-thought-toggle";
import "../src/chain-of-thought";
import "../src/chain-of-thought-step";
import "../src/tool-call-data";
import "../../markdown";
import { LitElement, css, html, nothing } from "lit";

const defaultSteps = [
  {
    title: "Collect customer context",
    description:
      "Gathered the customer's prior interactions and relevant metadata for grounding.",
    toolName: "context_collector",
    input: `\`\`\`
{ "customerId": "58429", "channels": ["email", "chat"] }
\`\`\``,
    output: `\`\`\`
{ "recentIssues": 2, "priority": "standard" }
\`\`\``,
  },
  {
    title: "Draft remediation plan",
    description: "Outlined steps to correct the reported connectivity issue.",
    toolName: "planner",
    input: `\`\`\`
{ "issue": "vpn_disconnects", "priority": "standard" }
\`\`\``,
    output: `\`\`\`
- Validate user credentials
- Rotate access token
- Reconnect VPN gateway
\`\`\``,
  },
  {
    title: "Send confirmation",
    description: "Confirming steps were sent to the customer.",
    toolName: "messaging",
    status: "processing",
  },
];

class ChainOfThoughtToggleDemo extends LitElement {
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
    this.openLabelText = "Hide chain of thought";
    this.closedLabelText = "Show chain of thought";
    this.panelId = "chain-of-thought-toggle-demo";
    this.steps = defaultSteps;
  }

  render() {
    return html`
      <div class="demo">
        <cds-aichat-chain-of-thought-toggle
          .open=${this.open}
          panel-id=${this.panelId}
          .openLabelText=${this.openLabelText}
          .closedLabelText=${this.closedLabelText}
          @chain-of-thought-toggle=${this._handleToggle}
        ></cds-aichat-chain-of-thought-toggle>
        <cds-aichat-chain-of-thought id=${this.panelId} .open=${this.open}>
          ${this.steps?.map(
            (step, index) => html`
              <cds-aichat-chain-of-thought-step
                title=${step.title}
                status=${step.status ?? "success"}
                step-number=${index + 1}
                ?open=${step.open}
              >
                <cds-aichat-tool-call-data tool-name=${step.toolName ?? ""}>
                  ${step.description
                    ? html`<cds-aichat-markdown slot="description">
                        ${step.description}
                      </cds-aichat-markdown>`
                    : nothing}
                  ${step.input
                    ? html`<cds-aichat-markdown slot="input">
                        ${step.input}
                      </cds-aichat-markdown>`
                    : nothing}
                  ${step.output
                    ? html`<cds-aichat-markdown slot="output">
                        ${step.output}
                      </cds-aichat-markdown>`
                    : nothing}
                </cds-aichat-tool-call-data>
              </cds-aichat-chain-of-thought-step>
            `,
          )}
        </cds-aichat-chain-of-thought>
      </div>
    `;
  }

  _handleToggle = (event) => {
    this.open = event.detail?.open ?? !this.open;
  };
}

if (!customElements.get("cds-aichat-chain-of-thought-toggle-demo")) {
  customElements.define(
    "cds-aichat-chain-of-thought-toggle-demo",
    ChainOfThoughtToggleDemo,
  );
}

export default {
  title: "Components/Chain of thought/Toggle",
  component: "cds-aichat-chain-of-thought-toggle",
  parameters: {
    docs: {
      description: {
        component:
          "A dedicated toggle button for expanding or collapsing the chain-of-thought wrapper. Pair it with `cds-aichat-chain-of-thought` when you manage open state externally.",
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
        "ID of the chain-of-thought wrapper used for accessibility bindings.",
    },
    open: {
      control: "boolean",
      description: "Whether the wrapper is expanded.",
    },
    steps: {
      control: "object",
      description:
        "Chain-of-thought steps passed to the wrapper (used in the demo composition).",
    },
  },
};

export const Default = {
  args: {
    openLabelText: "Hide chain of thought",
    closedLabelText: "Show chain of thought",
    panelId: "chain-of-thought-toggle-demo",
    open: true,
    steps: defaultSteps,
  },
  render: (args) => html`
    <cds-aichat-chain-of-thought-toggle-demo
      open-label-text=${args.openLabelText}
      closed-label-text=${args.closedLabelText}
      panel-id=${args.panelId}
      .open=${args.open}
      .steps=${args.steps}
    ></cds-aichat-chain-of-thought-toggle-demo>
  `,
};
