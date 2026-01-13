/* eslint-disable */
import React from "react";
import ChainOfThoughtToggle from "../../../react/chain-of-thought-toggle";
import ChainOfThought from "../../../react/chain-of-thought";
import ChainOfThoughtStep from "../../../react/chain-of-thought-step";
import ToolCallData from "../../../react/tool-call-data";
import Markdown from "../../../react/markdown";

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

const renderSteps = (steps) =>
  steps.map((step, index) => (
    <ChainOfThoughtStep
      key={step.title || step.toolName || index}
      title={step.title}
      status={step.status || "success"}
      stepNumber={index + 1}
      open={Boolean(step.open)}
    >
      <ToolCallData toolName={step.toolName}>
        {step.description ? (
          <Markdown slot="description">{step.description}</Markdown>
        ) : null}
        {step.input ? <Markdown slot="input">{step.input}</Markdown> : null}
        {step.output ? <Markdown slot="output">{step.output}</Markdown> : null}
      </ToolCallData>
    </ChainOfThoughtStep>
  ));

export default {
  title: "Components/Chain of thought/Toggle",
  component: ChainOfThoughtToggle,
  parameters: {
    docs: {
      description: {
        component:
          "A dedicated toggle button for expanding or collapsing the chain-of-thought wrapper. Compose it with `ChainOfThought` when you manage open state externally.",
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
    onToggle: {
      action: "onToggle",
      table: { category: "events" },
      description:
        "Emitted when the toggle is activated. Use it to sync controlled state.",
    },
  },
  args: {
    openLabelText: "Hide chain of thought",
    closedLabelText: "Show chain of thought",
    open: true,
    steps: defaultSteps,
    onToggle: (event) => {
      console.log("onToggle", event?.detail);
    },
  },
};

export const Default = {
  render: (args) => {
    const [open, setOpen] = React.useState(args.open);
    const panelId = React.useId();

    React.useEffect(() => {
      setOpen(args.open);
    }, [args.open]);

    const handleToggle = (event) => {
      args.onToggle?.(event);
      setOpen(event.detail?.open ?? false);
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <ChainOfThoughtToggle
          panelId={panelId}
          open={open}
          openLabelText={args.openLabelText}
          closedLabelText={args.closedLabelText}
          onToggle={handleToggle}
        />
        <ChainOfThought
          id={panelId}
          panelId={panelId}
          open={open}
          onToggle={handleToggle}
        >
          {renderSteps(args.steps)}
        </ChainOfThought>
      </div>
    );
  },
};
