/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/chain-of-thought";
import "../src/chain-of-thought-step";
import "../src/tool-call-data";
import "../src/chain-of-thought-toggle";
import "../../markdown/src/markdown";
import { html, nothing } from "lit";

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

const renderStep = (step) => {
  const requestMarkdown = step.request?.args;
  const responseMarkdown = step.response?.content;

  return html`
    <cds-aichat-chain-of-thought-step
      title=${step.title}
      status=${step.status ?? "success"}
      ?open=${step.open ?? false}
      step-number=${step.stepNumber ?? ""}
    >
      <cds-aichat-tool-call-data tool-name=${step.tool_name ?? ""}>
        ${step.description
          ? html`<div slot="description">
              <cds-aichat-markdown> ${step.description} </cds-aichat-markdown>
            </div>`
          : nothing}
        ${requestMarkdown
          ? html`<div slot="input">
              <cds-aichat-markdown> ${requestMarkdown} </cds-aichat-markdown>
            </div>`
          : nothing}
        ${responseMarkdown
          ? html`<div slot="output">
              <cds-aichat-markdown> ${responseMarkdown} </cds-aichat-markdown>
            </div>`
          : nothing}
      </cds-aichat-tool-call-data>
    </cds-aichat-chain-of-thought-step>
  `;
};

const syncPanelOpen = (panelId) => (event) => {
  const panel = document.getElementById(panelId);
  if (panel) {
    panel.open = event.detail?.open ?? false;
  }
};

const renderChainOfThought = (args, steps) => {
  const panelId =
    args.panelId ||
    `chain-of-thought-panel-${Math.random().toString(36).slice(2)}`;

  return html`
    <cds-aichat-chain-of-thought-toggle
      panel-id=${panelId}
      ?open=${args.open}
      open-label-text=${args.openLabelText}
      closed-label-text=${args.closedLabelText}
      @chain-of-thought-toggle=${syncPanelOpen(panelId)}
    ></cds-aichat-chain-of-thought-toggle>
    <cds-aichat-chain-of-thought
      id=${panelId}
      panel-id=${panelId}
      ?open=${args.open}
    >
      ${steps.map((step, index) =>
        renderStep({ ...step, stepNumber: index + 1 }),
      )}
    </cds-aichat-chain-of-thought>
  `;
};

export default {
  title: "Components/Chain of thought",
  component: "cds-aichat-chain-of-thought",
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
      description: "Text when the panel is collapsed",
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
    renderChainOfThought(args, [
      { ...sampleSteps[0], open: true },
      ...sampleSteps.slice(1),
    ]),
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
