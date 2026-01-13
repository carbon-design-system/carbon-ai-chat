/* eslint-disable */
import React, { useMemo, useState } from "react";

import ReasoningStepsToggle from "../../../react/reasoning-steps-toggle";
import ReasoningSteps from "../../../react/reasoning-steps";
import ReasoningStep from "../../../react/reasoning-step";
import Markdown from "../../../react/markdown";

const defaultSteps = [
  {
    id: "context",
    title: "Gather context",
    open: true,
    body: (
      <Markdown>
        Pulled the last few messages plus system instructions to ground the
        reasoning.
      </Markdown>
    ),
  },
  {
    id: "outline",
    title: "Plan answer",
    body: (
      <Markdown>
        Drafted a response outline and verified coverage against the request.
      </Markdown>
    ),
  },
  {
    id: "quality",
    title: "Quality check",
    body: (
      <Markdown>
        Ensured tone, safety, and citations were in place before finalizing.
      </Markdown>
    ),
  },
];

const Demo = ({ args }) => {
  const [open, setOpen] = useState(args.open);
  const steps = useMemo(() => args.steps ?? defaultSteps, [args.steps]);

  return (
    <div
      style={{
        display: "grid",
        gap: "0.75rem",
        maxWidth: "48rem",
      }}
    >
      <ReasoningStepsToggle
        open={open}
        panelID={args.panelId}
        openLabelText={args.openLabelText}
        closedLabelText={args.closedLabelText}
        onToggle={(event) => {
          setOpen(event?.detail?.open ?? !open);
        }}
      />
      <ReasoningSteps open={open}>
        {steps.map((step) => (
          <ReasoningStep key={step.id} title={step.title} open={step.open}>
            {step.body || null}
          </ReasoningStep>
        ))}
      </ReasoningSteps>
    </div>
  );
};

export default {
  title: "Components/Reasoning steps/Toggle",
  args: {
    openLabelText: "Hide reasoning steps",
    closedLabelText: "Show reasoning steps",
    panelId: "reasoning-steps-toggle-react",
    open: true,
    steps: defaultSteps,
  },
  argTypes: {
    openLabelText: {
      control: "text",
      description: "Label shown when the wrapper is expanded.",
    },
    closedLabelText: {
      control: "text",
      description: "Label shown when the wrapper is collapsed.",
    },
    panelId: {
      control: "text",
      description: "ID applied to the reasoning steps container.",
    },
    open: {
      control: "boolean",
      description: "Whether the wrapper is expanded.",
    },
    steps: {
      control: "object",
      description:
        "Reasoning steps rendered inside the wrapper (used by the demo composition).",
    },
  },
};

export const Default = {
  render: (args) => <Demo args={args} />,
};
