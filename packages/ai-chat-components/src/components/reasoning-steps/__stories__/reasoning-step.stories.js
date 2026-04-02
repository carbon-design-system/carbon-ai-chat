/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../src/reasoning-step";
import "../src/reasoning-steps";
import "../../markdown/src/markdown";
import { html } from "lit";

const defaultBody = html`<cds-aichat-markdown
  .markdown=${`Validated supporting documents, captured relevant citations, and noted
confidence levels before drafting a response.`}
></cds-aichat-markdown>`;

export default {
  title: "Components/Reasoning steps/Step",
  component: "cds-aichat-reasoning-step",
  parameters: {
    docs: {
      description: {
        component:
          "Represents a single entry within the reasoning steps timeline. Supports controlled or uncontrolled open state when paired with cds-aichat-reasoning-steps.",
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
  },
  args: {
    title: "Review retrieved context",
    open: true,
    controlled: false,
  },
};

export const Default = {
  render: (args) => html`
    <cds-aichat-reasoning-steps open>
      <cds-aichat-reasoning-step
        title=${args.title}
        ?open=${args.open}
        ?controlled=${args.controlled}
      >
        ${defaultBody}
      </cds-aichat-reasoning-step>
      <cds-aichat-reasoning-step title="Awaiting attachments">
      </cds-aichat-reasoning-step>
    </cds-aichat-reasoning-steps>
  `,
};

export const Static = {
  render: () => html`
    <cds-aichat-reasoning-steps open>
      <cds-aichat-reasoning-step title="Context missing">
      </cds-aichat-reasoning-step>
    </cds-aichat-reasoning-steps>
  `,
};
