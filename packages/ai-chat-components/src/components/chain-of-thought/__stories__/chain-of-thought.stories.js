/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/cds-aichat-chain-of-thought";
import { html } from "lit";

const sampleSteps = [
  {
    title: "Search Documentation",
    description: "Searching the product documentation for relevant information",
    tool_name: "documentation_search",
    request: {
      args: {
        query: "API authentication methods",
        filters: {
          section: "security",
          version: "latest",
        },
      },
    },
    response: {
      content: {
        results: [
          {
            title: "OAuth 2.0 Authentication",
            snippet: "The API supports OAuth 2.0 for secure authentication...",
          },
          {
            title: "API Key Authentication",
            snippet:
              "API keys can be used for server-to-server authentication...",
          },
        ],
        count: 2,
      },
    },
    status: "success",
  },
  {
    title: "Query Database",
    description: "Fetching user-specific configuration data",
    tool_name: "database_query",
    request: {
      args: {
        table: "user_settings",
        where: {
          user_id: "12345",
        },
      },
    },
    response: {
      content: {
        auth_method: "oauth",
        scopes: ["read", "write"],
        token_expiry: 3600,
      },
    },
    status: "success",
  },
  {
    title: "Generate Response",
    description: "Synthesizing the information into a final answer",
    tool_name: "response_generator",
    request: {
      args: {
        context: "authentication",
        format: "markdown",
      },
    },
    response: {
      content:
        "Based on the documentation and your settings, you're using **OAuth 2.0** authentication with read and write scopes. Your tokens expire after 1 hour.",
    },
    status: "success",
  },
];

const stepsWithDifferentStatuses = [
  {
    title: "Validate Input",
    tool_name: "input_validator",
    request: {
      args: {
        input: "test@example.com",
        type: "email",
      },
    },
    response: {
      content: { valid: true },
    },
    status: "success",
  },
  {
    title: "Send Email",
    tool_name: "email_sender",
    request: {
      args: {
        to: "test@example.com",
        subject: "Test Email",
      },
    },
    response: {
      content: { error: "SMTP connection timeout" },
    },
    status: "failure",
  },
  {
    title: "Retry Send Email",
    tool_name: "email_sender",
    request: {
      args: {
        to: "test@example.com",
        subject: "Test Email",
        retry: true,
      },
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
      args: {
        dataset_id: "sales_2024_q1",
        metrics: ["revenue", "units_sold", "customer_count"],
        groupBy: "month",
      },
    },
    response: {
      content: `## Analysis Results

The Q1 2024 sales data shows strong performance across all metrics:

### Key Findings

- **Revenue Growth**: 23% increase compared to Q1 2023
- **Unit Sales**: 15,432 units sold (+18% YoY)
- **Customer Acquisition**: 2,847 new customers

### Monthly Breakdown

| Month | Revenue | Units | New Customers |
|-------|---------|-------|---------------|
| Jan   | $127K   | 4,832 | 892           |
| Feb   | $143K   | 5,123 | 967           |
| Mar   | $156K   | 5,477 | 988           |

The upward trend suggests continued strong performance in Q2.`,
    },
    status: "success",
  },
];

export default {
  title: "Components/Chain of Thought",
  argTypes: {
    open: {
      control: "boolean",
      description: "Whether the chain of thought panel is open",
    },
    explainabilityText: {
      control: "text",
      description: "Text for the button to open the panel",
    },
    inputLabelText: {
      control: "text",
      description: "Label for step inputs",
    },
    outputLabelText: {
      control: "text",
      description: "Label for step outputs",
    },
    toolLabelText: {
      control: "text",
      description: "Label for tool names",
    },
    statusSucceededLabelText: {
      control: "text",
      description: "Label for success status icon",
    },
    statusFailedLabelText: {
      control: "text",
      description: "Label for failure status icon",
    },
    statusProcessingLabelText: {
      control: "text",
      description: "Label for processing status icon",
    },
  },
};

export const Default = {
  args: {
    open: false,
    explainabilityText: "Show chain of thought",
    inputLabelText: "Input",
    outputLabelText: "Output",
    toolLabelText: "Tool",
    statusSucceededLabelText: "Succeeded",
    statusFailedLabelText: "Failed",
    statusProcessingLabelText: "Processing",
  },
  render: (args) => html`
    <cds-aichat-chain-of-thought
      ?open=${args.open}
      .steps=${sampleSteps}
      explainability-text=${args.explainabilityText}
      input-label-text=${args.inputLabelText}
      output-label-text=${args.outputLabelText}
      tool-label-text=${args.toolLabelText}
      status-succeeded-label-text=${args.statusSucceededLabelText}
      status-failed-label-text=${args.statusFailedLabelText}
      status-processing-label-text=${args.statusProcessingLabelText}
    >
    </cds-aichat-chain-of-thought>
  `,
};

export const WithStepsOpen = {
  args: {
    open: true,
    explainabilityText: "Show chain of thought",
    inputLabelText: "Input",
    outputLabelText: "Output",
    toolLabelText: "Tool",
    statusSucceededLabelText: "Succeeded",
    statusFailedLabelText: "Failed",
    statusProcessingLabelText: "Processing",
  },
  render: (args) => html`
    <cds-aichat-chain-of-thought
      ?open=${args.open}
      .steps=${sampleSteps}
      explainability-text=${args.explainabilityText}
      input-label-text=${args.inputLabelText}
      output-label-text=${args.outputLabelText}
      tool-label-text=${args.toolLabelText}
      status-succeeded-label-text=${args.statusSucceededLabelText}
      status-failed-label-text=${args.statusFailedLabelText}
      status-processing-label-text=${args.statusProcessingLabelText}
    >
    </cds-aichat-chain-of-thought>
  `,
};

export const WithDifferentStatuses = {
  args: {
    open: true,
    explainabilityText: "Show chain of thought",
    inputLabelText: "Input",
    outputLabelText: "Output",
    toolLabelText: "Tool",
    statusSucceededLabelText: "Succeeded",
    statusFailedLabelText: "Failed",
    statusProcessingLabelText: "Processing",
  },
  render: (args) => html`
    <cds-aichat-chain-of-thought
      ?open=${args.open}
      .steps=${stepsWithDifferentStatuses}
      explainability-text=${args.explainabilityText}
      input-label-text=${args.inputLabelText}
      output-label-text=${args.outputLabelText}
      tool-label-text=${args.toolLabelText}
      status-succeeded-label-text=${args.statusSucceededLabelText}
      status-failed-label-text=${args.statusFailedLabelText}
      status-processing-label-text=${args.statusProcessingLabelText}
    >
    </cds-aichat-chain-of-thought>
  `,
};

export const WithComplexResponses = {
  args: {
    open: true,
    explainabilityText: "Show chain of thought",
    inputLabelText: "Input",
    outputLabelText: "Output",
    toolLabelText: "Tool",
    statusSucceededLabelText: "Succeeded",
    statusFailedLabelText: "Failed",
    statusProcessingLabelText: "Processing",
  },
  render: (args) => html`
    <cds-aichat-chain-of-thought
      ?open=${args.open}
      .steps=${stepsWithComplexResponses}
      explainability-text=${args.explainabilityText}
      input-label-text=${args.inputLabelText}
      output-label-text=${args.outputLabelText}
      tool-label-text=${args.toolLabelText}
      status-succeeded-label-text=${args.statusSucceededLabelText}
      status-failed-label-text=${args.statusFailedLabelText}
      status-processing-label-text=${args.statusProcessingLabelText}
    >
    </cds-aichat-chain-of-thought>
  `,
};
