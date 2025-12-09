/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/chain-of-thought-step";
import "../src/chain-of-thought";
import "../src/tool-call-data";
import "../../markdown";
import { html } from "lit";

const request = `\`\`\`json
{ "query": "recent outages in eu-west", "limit": 3 }
\`\`\``;

const response = `\`\`\`json
{
  "incidents": [
    { "id": "OUT-483", "status": "resolved" },
    { "id": "OUT-479", "status": "monitoring" }
  ]
}
\`\`\``;

export default {
  title: "Components/Chain of thought/Step",
  component: "cds-aichat-chain-of-thought-step",
  parameters: {
    docs: {
      description: {
        component:
          "Represents a single chain-of-thought entry. Supports controlled or uncontrolled open state when paired with `cds-aichat-chain-of-thought`.",
      },
    },
  },
  argTypes: {
    title: {
      control: "text",
      description: "Label displayed in the step header.",
    },
    status: {
      control: "select",
      options: ["success", "failure", "processing"],
      description: "Status indicator for the step.",
    },
    open: {
      control: "boolean",
      description: "Whether the step is expanded.",
    },
    controlled: {
      control: "boolean",
      description:
        "When true, the host application must update the open state in response to toggle events.",
    },
    statusSucceededLabelText: {
      control: "text",
      description: "Assistive text when a step has succeeded.",
    },
    statusFailedLabelText: {
      control: "text",
      description: "Assistive text when a step failed.",
    },
    statusProcessingLabelText: {
      control: "text",
      description: "Assistive text when a step is processing.",
    },
  },
  args: {
    title: "Check recent incidents",
    status: "success",
    open: true,
    controlled: false,
    statusSucceededLabelText: "Succeeded",
    statusFailedLabelText: "Failed",
    statusProcessingLabelText: "Processing",
  },
};

export const Default = {
  render: (args) => html`
    <cds-aichat-chain-of-thought open>
      <cds-aichat-chain-of-thought-step
        title=${args.title}
        status=${args.status}
        ?open=${args.open}
        ?controlled=${args.controlled}
        status-succeeded-label-text=${args.statusSucceededLabelText}
        status-failed-label-text=${args.statusFailedLabelText}
        status-processing-label-text=${args.statusProcessingLabelText}
        step-number="1"
      >
        <cds-aichat-tool-call-data tool-name="incident_lookup">
          <cds-aichat-markdown slot="description">
            Look up recent outages affecting the EU region before escalating.
          </cds-aichat-markdown>
          <cds-aichat-markdown slot="input">${request}</cds-aichat-markdown>
          <cds-aichat-markdown slot="output">${response}</cds-aichat-markdown>
        </cds-aichat-tool-call-data>
      </cds-aichat-chain-of-thought-step>
      <cds-aichat-chain-of-thought-step
        title="Awaiting confirmation"
        status="processing"
        step-number="2"
      >
      </cds-aichat-chain-of-thought-step>
    </cds-aichat-chain-of-thought>
  `,
};

export const Static = {
  render: () => html`
    <cds-aichat-chain-of-thought open>
      <cds-aichat-chain-of-thought-step
        title="Plan remediation"
        status="success"
        step-number="1"
      >
      </cds-aichat-chain-of-thought-step>
    </cds-aichat-chain-of-thought>
  `,
};
