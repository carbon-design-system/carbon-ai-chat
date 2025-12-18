/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/tool-call-data";
import "../../markdown";
import { html } from "lit";

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
  component: "cds-aichat-tool-call-data",
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
  render: (args) => html`
    <cds-aichat-tool-call-data
      tool-name=${args.toolName}
      input-label-text=${args.inputLabelText}
      output-label-text=${args.outputLabelText}
      tool-label-text=${args.toolLabelText}
    >
      <div slot="description">
        <cds-aichat-markdown>
          Searching knowledge base for password reset guidance.
        </cds-aichat-markdown>
      </div>
      <div slot="input">
        <cds-aichat-markdown>${request}</cds-aichat-markdown>
      </div>
      <div slot="output">
        <cds-aichat-markdown>${response}</cds-aichat-markdown>
      </div>
    </cds-aichat-tool-call-data>
  `,
};
