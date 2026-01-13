/* eslint-disable */
import React from "react";
import ToolCallData from "../../../react/tool-call-data";
import Markdown from "../../../react/markdown";

const request = `\`\`\`bash
curl -X POST https://api.internal/v1/search \\
  -H "Authorization: Bearer ****" \\
  -d '{ "query": "reset password policy", "limit": 5 }'
\`\`\``;

const response = `\`\`\`json
{
  "results": [
    { "title": "Password reset policy", "id": "DOC-101" },
    { "title": "SAML reset flow", "id": "DOC-103" }
  ]
}
\`\`\``;

export default {
  title: "Components/Chain of thought/Tool call data",
  component: ToolCallData,
  parameters: {
    docs: {
      description: {
        component:
          "Structured container for displaying tool metadata and IO within chain-of-thought steps. Renders nothing when empty.",
      },
    },
  },
  argTypes: {
    toolName: {
      control: "text",
      description: "Plain text name of the tool.",
    },
    inputLabelText: {
      control: "text",
      description: "Label text shown above the input slot.",
    },
    outputLabelText: {
      control: "text",
      description: "Label text shown above the output slot.",
    },
    toolLabelText: {
      control: "text",
      description: "Label text shown above the tool name.",
    },
  },
  args: {
    toolName: "kb_search",
    inputLabelText: "Input",
    outputLabelText: "Output",
    toolLabelText: "Tool",
  },
};

export const Default = {
  render: (args) => (
    <ToolCallData
      toolName={args.toolName}
      inputLabelText={args.inputLabelText}
      outputLabelText={args.outputLabelText}
      toolLabelText={args.toolLabelText}
    >
      <Markdown slot="description">
        Searching knowledge base for password reset guidance.
      </Markdown>
      <Markdown slot="input">{request}</Markdown>
      <Markdown slot="output">{response}</Markdown>
    </ToolCallData>
  ),
};
