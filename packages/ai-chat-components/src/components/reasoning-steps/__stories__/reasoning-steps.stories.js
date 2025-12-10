/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/reasoning-steps";
import "../src/reasoning-step";
import "../../markdown/src/markdown";
import { html, css, LitElement, nothing } from "lit";

const defaultSteps = [
  {
    title: "Understand the request",
    open: true,
    body: html`<cds-aichat-markdown>
      Parsed the user's intent and restated it as a concise objective to make
      sure downstream steps share the same goal.
    </cds-aichat-markdown>`,
  },
  {
    title: "Review retrieved context",
    open: false,
    body: html`<cds-aichat-markdown>
      Checked the documents and conversation history to identify facts that are
      relevant to the objective and noted confidence levels.
    </cds-aichat-markdown>`,
  },
  {
    title: "Draft an answer",
    open: false,
    body: html`<cds-aichat-markdown>
      Combined the prompt with trusted context and generated a structured
      response with bullet points summarizing each insight.
    </cds-aichat-markdown>`,
  },
  {
    title: "Validate the response",
    open: false,
    body: html`<cds-aichat-markdown>
      Compared the answer with the original request, double-checked citations,
      and ensured tone guidelines were followed.
    </cds-aichat-markdown>`,
  },
];

const mixedSteps = [
  {
    title: "Detect missing data",
    open: true,
    body: html`<cds-aichat-markdown>
      Noticed the prompt referenced an attachment that was not available, so I
      documented the gap before drafting an answer.
    </cds-aichat-markdown>`,
  },
  {
    title: "Awaiting supporting citations",
  },
  {
    title: "Ready for escalation",
    body: html`<cds-aichat-markdown>
      The final recommendation needs human approval. I summarized the findings
      and highlighted the open questions to review.
    </cds-aichat-markdown>`,
  },
];

const logToggleEvent = (event) => {
  const stepElement = event
    .composedPath()
    .find(
      (node) =>
        node instanceof HTMLElement &&
        node.tagName?.toLowerCase() === "cds-aichat-reasoning-step",
    );
  const title =
    stepElement?.getAttribute?.("title") ||
    stepElement?.title ||
    "Reasoning step";
  const state = event.detail?.open ? "open" : "closed";
  console.log(`[Reasoning step] ${title} is now ${state}.`, event.detail);
};

const renderSteps = (args, steps) => html`
  <cds-aichat-reasoning-steps
    ?open=${args.open}
    ?controlled=${args.controlled}
    @cds-aichat-reasoning-step-toggled=${logToggleEvent}
  >
    ${steps.map(
      (step) => html`
        <cds-aichat-reasoning-step
          title=${step.title}
          ?open=${step.open ?? false}
        >
          ${step.body ?? nothing}
        </cds-aichat-reasoning-step>
      `,
    )}
  </cds-aichat-reasoning-steps>
`;

class ControlledReasoningStepsDemo extends LitElement {
  static properties = {
    openSteps: { attribute: false },
    wrapperOpen: { attribute: false },
  };

  static styles = css`
    :host {
      display: block;
    }

    .controls {
      display: flex;
      gap: 0.5rem;
      margin-block-end: 0.75rem;
    }

    button {
      font: inherit;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
      border: 1px solid #c6c6c6;
      background: #fff;
      cursor: pointer;
    }

    button:hover {
      background: #f4f4f4;
    }
  `;

  constructor() {
    super();
    this.steps = [
      {
        id: "gather-context",
        title: "Gather relevant context",
        body: html`<cds-aichat-markdown>
          Pulled customer profile data, product catalog entries, and the latest
          troubleshooting articles that match the request.
        </cds-aichat-markdown>`,
      },
      {
        id: "draft-plan",
        title: "Draft plan",
        body: html`<cds-aichat-markdown>
          Proposed a three-step plan that addresses the user's main objective
          while calling out any assumptions.
        </cds-aichat-markdown>`,
      },
      {
        id: "risk-check",
        title: "Run risk checks",
        body: html`<cds-aichat-markdown>
          <ul>
            <li>Verified we are not leaking PII.</li>
            <li>Ensured rate limits are respected.</li>
            <li>Confirmed tone aligns with support guidelines.</li>
          </ul>
        </cds-aichat-markdown>`,
      },
      {
        id: "handoff",
        title: "Ready for human review",
      },
    ];
    this.openSteps = new Set([this.steps[0].id]);
    this.wrapperOpen = true;
  }

  render() {
    return html`
      <div class="controls">
        <button type="button" @click=${() => this._toggleAll(true)}>
          Open all
        </button>
        <button type="button" @click=${() => this._toggleAll(false)}>
          Collapse all
        </button>
        <button type="button" @click=${() => this._toggleWrapper()}>
          ${this.wrapperOpen ? "Hide all" : "Show all"}
        </button>
      </div>
      <cds-aichat-reasoning-steps ?open=${this.wrapperOpen} controlled>
        ${this.steps.map(
          (step) => html`
            <cds-aichat-reasoning-step
              data-step-id=${step.id}
              title=${step.title}
              ?open=${this.openSteps.has(step.id)}
              controlled
              @cds-aichat-reasoning-step-beingtoggled=${(event) =>
                this._handleControlledToggle(event, step.id)}
            >
              ${step.body ?? nothing}
            </cds-aichat-reasoning-step>
          `,
        )}
      </cds-aichat-reasoning-steps>
    `;
  }

  _toggleAll(shouldOpen) {
    const next = new Set();
    if (shouldOpen) {
      this.steps.forEach((step) => {
        if (step.body) {
          next.add(step.id);
        }
      });
    }
    this.openSteps = next;
  }

  _toggleWrapper() {
    this.wrapperOpen = !this.wrapperOpen;
  }

  _handleControlledToggle(event, stepId) {
    const { open } = event.detail || {};
    const next = new Set(this.openSteps);
    if (open) {
      next.add(stepId);
    } else {
      next.delete(stepId);
    }
    this.openSteps = next;
  }
}

if (!customElements.get("cds-aichat-reasoning-steps-controlled-demo")) {
  customElements.define(
    "cds-aichat-reasoning-steps-controlled-demo",
    ControlledReasoningStepsDemo,
  );
}

export default {
  title: "Components/Reasoning steps",
  component: "cds-aichat-reasoning-steps",
  parameters: {
    docs: {
      description: {
        component:
          "Displays a list of reasoning steps. Supports auto-open/close behavior or fully controlled state managed by the host.",
      },
    },
  },
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the reasoning steps wrapper is expanded.",
    },
    controlled: {
      control: "boolean",
      description:
        "When true, each child step must be controlled by the host application.",
    },
  },
  args: {
    open: true,
    controlled: false,
  },
};

export const Default = {
  args: {
    open: true,
    controlled: false,
  },
  render: (args) => renderSteps(args, defaultSteps),
};

export const WithStaticSteps = {
  args: {
    open: true,
    controlled: false,
  },
  render: (args) => renderSteps(args, mixedSteps),
};

export const Controlled = {
  render: () =>
    html`<cds-aichat-reasoning-steps-controlled-demo></cds-aichat-reasoning-steps-controlled-demo>`,
};
