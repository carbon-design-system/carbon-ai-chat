/* eslint-disable */
import React from "react";
import ReasoningSteps from "../../../react/reasoning-steps";
import ReasoningStep from "../../../react/reasoning-step";
import Markdown from "../../../react/markdown";

const defaultBody = (
  <Markdown
    markdown={`Confirmed the retrieved snippets map to the user's request and captured any
open questions before drafting a response.`}
  />
);

export default {
  title: "Components/Reasoning steps/Step",
  component: ReasoningStep,
  parameters: {
    docs: {
      description: {
        component:
          "Represents a single entry within the reasoning steps timeline. Supports controlled or uncontrolled open state when paired with ReasoningSteps.",
      },
    },
  },
  argTypes: {
    title: {
      control: "text",
      description: "Label displayed in the step header.",
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
    title: "Review retrieved context",
    open: true,
    controlled: false,
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
      <ReasoningSteps open>
        <ReasoningStep
          title={args.title}
          open={args.open}
          controlled={args.controlled}
          onBeforeToggle={args.onBeforeToggle}
          onToggle={args.onToggle}
        >
          {defaultBody}
        </ReasoningStep>
        <ReasoningStep
          title="Awaiting attachments"
          onBeforeToggle={args.onBeforeToggle}
          onToggle={args.onToggle}
        />
      </ReasoningSteps>
    </div>
  ),
};

export const Static = {
  render: () => (
    <div style={{ maxWidth: "32rem" }}>
      <ReasoningSteps open>
        <ReasoningStep title="Context missing" />
      </ReasoningSteps>
    </div>
  ),
};
