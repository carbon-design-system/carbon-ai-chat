/* eslint-disable */
import React from "react";
import ChainOfThought from "../../../react/chain-of-thought";
import ChainOfThoughtStep from "../../../react/chain-of-thought-step";
import ToolCallData from "../../../react/tool-call-data";
import Markdown from "../../../react/markdown";

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
  component: ChainOfThoughtStep,
  parameters: {
    docs: {
      description: {
        component:
          "Represents a single chain-of-thought entry. Supports controlled or uncontrolled open state when paired with `ChainOfThought`.",
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
    onBeforeToggle: {
      action: "onBeforeToggle",
      table: { category: "events" },
      description:
        "Fires before a toggle; return false to prevent the open state from changing.",
    },
    onToggle: {
      action: "onToggle",
      table: { category: "events" },
      description:
        "Emitted after a toggle request. Useful for syncing controlled state.",
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
    onBeforeToggle: (event) => {
      console.log("onBeforeToggle", event?.detail);
    },
    onToggle: (event) => {
      console.log("onToggle", event?.detail);
    },
  },
};

export const Default = {
  render: (args) => (
    <div style={{ maxWidth: "32rem" }}>
      <ChainOfThought open>
        <ChainOfThoughtStep
          title={args.title}
          status={args.status}
          open={args.open}
          controlled={args.controlled}
          statusSucceededLabelText={args.statusSucceededLabelText}
          statusFailedLabelText={args.statusFailedLabelText}
          statusProcessingLabelText={args.statusProcessingLabelText}
          stepNumber={1}
          onBeforeToggle={args.onBeforeToggle}
          onToggle={args.onToggle}
        >
          <ToolCallData toolName="incident_lookup">
            <Markdown
              slot="description"
              markdown="Look up recent outages affecting the EU region before escalating."
            />
            <Markdown slot="input" markdown={request} />
            <Markdown slot="output" markdown={response} />
          </ToolCallData>
        </ChainOfThoughtStep>
        <ChainOfThoughtStep
          title="Awaiting confirmation"
          status="processing"
          stepNumber={2}
          onBeforeToggle={args.onBeforeToggle}
          onToggle={args.onToggle}
        />
      </ChainOfThought>
    </div>
  ),
};

export const Static = {
  render: () => (
    <div style={{ maxWidth: "32rem" }}>
      <ChainOfThought open>
        <ChainOfThoughtStep
          title="Plan remediation"
          status="success"
          stepNumber={1}
        />
      </ChainOfThought>
    </div>
  ),
};
