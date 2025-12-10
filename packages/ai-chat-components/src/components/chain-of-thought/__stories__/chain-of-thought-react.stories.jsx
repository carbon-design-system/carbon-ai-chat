/* eslint-disable */
import React from "react";
import ChainOfThought from "../../../react/chain-of-thought";
import ChainOfThoughtStep from "../../../react/chain-of-thought-step";
import ChainOfThoughtToggle from "../../../react/chain-of-thought-toggle";
import ToolCallData from "../../../react/tool-call-data";
import Markdown from "../../../react/markdown";

const sampleSteps = [
  {
    title: "Search Documentation",
    description: "Searching the product documentation for relevant information",
    tool_name: "documentation_search",
    request: {
      args: `\`\`\`
{
  "query": "API authentication methods",
  "filters": {
    "section": "security",
    "version": "latest"
  }
}
\`\`\``,
    },
    response: {
      content: `\`\`\`
{
  "results": [
    {
      "title": "OAuth 2.0 Authentication",
      "snippet": "The API supports OAuth 2.0 for secure authentication..."
    },
    {
      "title": "API Key Authentication",
      "snippet": "API keys can be used for server-to-server authentication..."
    }
  ],
  "count": 2
}
\`\`\``,
    },
    status: "success",
  },
  {
    title: "Query Database",
    description: "Fetching user-specific configuration data",
    tool_name: "database_query",
    request: {
      args: `\`\`\`
{
  "table": "user_settings",
  "where": {
    "user_id": "12345"
  }
}
\`\`\``,
    },
    response: {
      content: `\`\`\`
{
  "auth_method": "oauth",
  "scopes": ["read", "write"],
  "token_expiry": 3600
}
\`\`\``,
    },
    status: "success",
  },
  {
    title: "Generate Response",
    description: "Synthesizing the information into a final answer",
    tool_name: "response_generator",
    request: {
      args: `\`\`\`
{
  "context": "authentication",
  "format": "markdown"
}
\`\`\``,
    },
    response: {
      content: `\`\`\`
{
  "summary": "Based on the documentation and your settings, you're using OAuth 2.0 authentication with read and write scopes.",
  "token_expiry_hours": 1
}
\`\`\``,
    },
    status: "success",
  },
];

const stepsWithDifferentStatuses = [
  {
    title: "Validate Input",
    tool_name: "input_validator",
    request: {
      args: `\`\`\`
{
  "input": "test@example.com",
  "type": "email"
}
\`\`\``,
    },
    response: {
      content: `\`\`\`
{ "valid": true }
\`\`\``,
    },
    status: "success",
  },
  {
    title: "Send Email",
    tool_name: "email_sender",
    request: {
      args: `\`\`\`
{
  "to": "test@example.com",
  "subject": "Test Email"
}
\`\`\``,
    },
    response: {
      content: `\`\`\`
{ "error": "SMTP connection timeout" }
\`\`\``,
    },
    status: "failure",
  },
  {
    title: "Retry Send Email",
    tool_name: "email_sender",
    request: {
      args: `\`\`\`
{
  "to": "test@example.com",
  "subject": "Test Email",
  "retry": true
}
\`\`\``,
    },
    status: "processing",
  },
];

const stepsWithComplexResponses = [
  {
    title: "Analyze Data",
    description:
      "Running statistical analysis on the provided dataset to identify trends and patterns.",
    tool_name: "data_analyzer",
    request: {
      args: `\`\`\`
{
  "dataset_id": "sales_2024_q1",
  "metrics": ["revenue", "units_sold", "customer_count"],
  "groupBy": "month"
}
\`\`\``,
    },
    response: {
      content: `\`\`\`
{
  "summary": "Q1 2024 sales show strong performance across revenue, units, and customer acquisition.",
  "revenue_growth_yoy": 0.23,
  "unit_sales": 15432,
  "new_customers": 2847,
  "monthly_breakdown": [
    { "month": "Jan", "revenue": "$127K", "units": 4832, "new_customers": 892 },
    { "month": "Feb", "revenue": "$143K", "units": 5123, "new_customers": 967 },
    { "month": "Mar", "revenue": "$156K", "units": 5477, "new_customers": 988 }
  ]
}
\`\`\``,
    },
    status: "success",
  },
];

const renderSteps = (steps) =>
  steps.map((step, index) => {
    const requestMarkdown = step.request?.args;
    const responseMarkdown = step.response?.content;

    return (
      <ChainOfThoughtStep
        key={step.title || step.tool_name || index}
        title={step.title}
        status={step.status || "success"}
        open={Boolean(step.open)}
        stepNumber={index + 1}
      >
        <ToolCallData toolName={step.tool_name}>
          {step.description ? (
            <Markdown slot="description">{step.description}</Markdown>
          ) : null}
          {requestMarkdown ? (
            <Markdown slot="input">{requestMarkdown}</Markdown>
          ) : null}
          {responseMarkdown ? (
            <Markdown slot="output">{responseMarkdown}</Markdown>
          ) : null}
        </ToolCallData>
      </ChainOfThoughtStep>
    );
  });

const renderChainOfThought = (args, steps) => {
  const [open, setOpen] = React.useState(args.open);
  const panelId = React.useId();

  React.useEffect(() => {
    setOpen(args.open);
  }, [args.open]);

  const handleToggle = (event) => setOpen(event.detail?.open ?? false);

  return (
    <>
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
        {renderSteps(steps)}
      </ChainOfThought>
    </>
  );
};

export default {
  title: "Components/Chain of thought",
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the chain of thought panel is open",
    },
    openLabelText: {
      control: "text",
      description: "Text when the panel is expanded",
    },
    closedLabelText: {
      control: "text",
      description: "Text for when the panel is collapsed",
    },
  },
};

export const Default = {
  args: {
    open: false,
    openLabelText: "Hide chain of thought",
    closedLabelText: "Show chain of thought",
  },
  render: (args) => renderChainOfThought(args, sampleSteps),
};

export const WithStepsOpen = {
  args: {
    open: true,
    openLabelText: "Hide chain of thought",
    closedLabelText: "Show chain of thought",
  },
  render: (args) =>
    renderChainOfThought(args, [{ ...sampleSteps[0], open: true }]),
};

export const WithDifferentStatuses = {
  args: {
    open: true,
    openLabelText: "Hide chain of thought",
    closedLabelText: "Show chain of thought",
  },
  render: (args) => renderChainOfThought(args, stepsWithDifferentStatuses),
};

export const WithComplexResponses = {
  args: {
    open: true,
    openLabelText: "Hide chain of thought",
    closedLabelText: "Show chain of thought",
  },
  render: (args) => renderChainOfThought(args, stepsWithComplexResponses),
};
