/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Mock backend for the markdown-override example. The reply exercises every
 * `markdown.customRenderers` hook so each override is visible at a glance:
 *
 *   1. `codeBlock` — a bare fence renders with `detectLanguage` set to
 *      `false`, so the snippet header shows only the line count.
 *   2. `table` — the markdown table renders through a Carbon data table.
 *   3. `link` — the anchor's `href` gains a `utm_source` query param and is
 *      forced to open in the same tab (`target="_self"`).
 *   4. `image` — a custom `app-image:` reference resolves to a real source and
 *      the image is clickable (alert on click).
 *   5. `checklist` — the task list becomes actionable; toggles are logged and
 *      persisted via `getChecked`.
 */

import {
  type ChatInstance,
  type CustomSendMessageOptions,
  type MessageRequest,
  MessageResponseTypes,
} from "@carbon/ai-chat";

const REPLY = `This example wires up five \`markdown.customRenderers\` hooks at once.

### Code block

The \`codeBlock\` hook swaps the default fenced-code renderer for a \`cds-aichat-code-snippet\` with \`detectLanguage\` set to \`false\`, so a bare fence shows only the line count — no detected-language label:

\`\`\`
def greet(name):
    print(f"Hello, {name}!")
\`\`\`

### Table

The \`table\` hook renders markdown tables through a Carbon \`cds-table\` instead of the default \`cds-aichat-table\`:

| Service | Status | Region |
| --- | --- | --- |
| API | Healthy | us-east-1 |
| Worker | Degraded | us-east-1 |
| Database | Healthy | us-west-2 |

### Link

The \`link\` hook rewrites anchors — here it appends a \`utm_source\` query param and keeps navigation in the same tab (\`target="_self"\`). Hover to see the rewritten URL:

[Carbon Design System](https://carbondesignsystem.com)

### Image

The \`image\` hook resolves a custom \`app-image:\` reference to a real source and makes the image clickable — click it for an alert:

![Two lions](app-image:lions)

### Checklist

The \`checklist\` hook makes task lists actionable. Toggle a box and watch the console; the state is persisted via \`getChecked\` so it survives re-renders:

- [ ] Review the design
- [x] Wire up the API
- [ ] Ship it
`;

async function customSendMessage(
  _request: MessageRequest,
  _requestOptions: CustomSendMessageOptions,
  instance: ChatInstance,
) {
  instance.messaging.addMessage({
    output: {
      generic: [
        {
          response_type: MessageResponseTypes.TEXT,
          text: REPLY,
        },
      ],
    },
  });
}

export { customSendMessage };
