/* eslint-disable */
import React, { useCallback, useMemo, useState } from "react";

import ReasoningSteps from "../../../react/reasoning-steps";
import ReasoningStep from "../../../react/reasoning-step";
import Markdown from "../../../react/markdown";

const defaultSteps = [
  {
    id: "understand-request",
    title: "Understand the request",
    open: true,
    body: (
      <Markdown
        markdown={`Parsed the prompt, highlighted constraints, and summarized the desired
outcome before searching for context.`}
      />
    ),
  },
  {
    id: "gather-context",
    title: "Gather supporting context",
    body: (
      <Markdown
        markdown={`Retrieved related CRM notes, the current entitlement, and the latest
knowledge base article covering the requested workflow.`}
      />
    ),
  },
  {
    id: "draft-response",
    title: "Draft response",
    body: (
      <Markdown
        markdown={`Generated an outline covering prerequisites, recommended actions, and a
confidence score for each suggestion.`}
      />
    ),
  },
  {
    id: "quality-check",
    title: "Quality check",
    body: (
      <Markdown
        markdown={`Double-checked that every claim is cited, confirmed there are no
conflicting instructions, and ensured tone guidelines are satisfied.`}
      />
    ),
  },
];

const staticSteps = [
  {
    id: "flag-gap",
    title: "Flagged missing information",
    body: (
      <Markdown
        markdown={`The prompt references a contract number that is not present in the data
set. Marked this as a gap for the reviewer.`}
      />
    ),
  },
  {
    id: "awaiting-attachments",
    title: "Awaiting attachments",
  },
  {
    id: "human-review",
    title: "Queued for human review",
    body: (
      <Markdown
        markdown={`Provided a condensed summary plus key questions to unblock the next
stage once artifacts arrive.`}
      />
    ),
  },
];

const logToggle = (event) => {
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
  console.log(`[React] ${title} is now ${state}.`, event.detail);
};

const renderSteps = (args, steps) => (
  <div style={{ maxWidth: "32rem" }}>
    <ReasoningSteps open={args.open} controlled={args.controlled}>
      {steps.map((step) => (
        <ReasoningStep
          key={step.id}
          title={step.title}
          open={step.open}
          controlled={step.controlled}
          onToggle={logToggle}
        >
          {step.body || null}
        </ReasoningStep>
      ))}
    </ReasoningSteps>
  </div>
);

const ControlledExample = () => {
  const steps = useMemo(
    () => [
      {
        id: "collect-signals",
        title: "Collect signals",
        body: (
          <Markdown
            markdown={`Pulled telemetry from the past 24 hours plus the latest error budget
numbers referenced in the prompt.`}
          />
        ),
      },
      {
        id: "evaluate-options",
        title: "Evaluate options",
        body: (
          <Markdown
            markdown={`Compared two viable remediation paths and scored them based on
impact, risk, and implementation effort.`}
          />
        ),
      },
      {
        id: "compose-reply",
        title: "Compose reply",
        body: (
          <Markdown
            markdown={`Crafted the recommended response with inline citations for every
factual statement.`}
          />
        ),
      },
      {
        id: "handoff",
        title: "Ready for escalation",
      },
    ],
    [],
  );

  const [openSteps, setOpenSteps] = useState(() => new Set([steps[0].id]));
  const [wrapperOpen, setWrapperOpen] = useState(true);

  const setAll = useCallback(
    (shouldOpen) => {
      setOpenSteps(() => {
        if (!shouldOpen) {
          return new Set();
        }
        const ids = steps.filter((step) => step.body).map((step) => step.id);
        return new Set(ids);
      });
    },
    [steps],
  );

  const handleToggle = useCallback((event) => {
    const stepId = event.target?.dataset?.stepId;
    if (!stepId) {
      return;
    }
    setOpenSteps((prev) => {
      const next = new Set(prev);
      if (event.detail?.open) {
        next.add(stepId);
      } else {
        next.delete(stepId);
      }
      return next;
    });
  }, []);

  return (
    <div style={{ maxWidth: "32rem" }}>
      <div
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "0.75rem",
        }}
      >
        <button type="button" onClick={() => setAll(true)}>
          Open all
        </button>
        <button type="button" onClick={() => setAll(false)}>
          Collapse all
        </button>
        <button type="button" onClick={() => setWrapperOpen((prev) => !prev)}>
          {wrapperOpen ? "Hide all" : "Show all"}
        </button>
      </div>
      <ReasoningSteps open={wrapperOpen} controlled>
        {steps.map((step) => (
          <ReasoningStep
            key={step.id}
            data-step-id={step.id}
            title={step.title}
            open={openSteps.has(step.id)}
            controlled
            onToggle={handleToggle}
          >
            {step.body || null}
          </ReasoningStep>
        ))}
      </ReasoningSteps>
    </div>
  );
};

export default {
  title: "Components/Reasoning steps",
  parameters: {
    docs: {
      description: {
        component:
          "Displays a sequence of reasoning steps that can expand/collapse and be either auto-managed or fully controlled by the host.",
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
        "When true, you are responsible for keeping each step's open state in sync.",
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
  render: (args) => renderSteps(args, staticSteps),
};

export const Controlled = {
  render: () => <ControlledExample />,
};
