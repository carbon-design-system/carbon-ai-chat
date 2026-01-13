/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import { html } from "lit";
import { getBodyContent } from "./story-hleper";
import styles from "./story-styles.scss?lit";

export default {
  title: "Components/Workspace shell/Body",
  component: "cds-aichat-workspace-shell-body",
  parameters: {
    docs: {
      description: {
        component:
          "Main content area of the workspace shell. Provides a scrollable container for workspace content.",
      },
    },
  },
  argTypes: {
    contentType: {
      control: {
        type: "select",
      },
      options: {
        "Short text": "short",
        "Long text": "long",
      },
      description: "Type of content to display in the body",
    },
  },
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      <cds-aichat-workspace-shell>${story()}</cds-aichat-workspace-shell>
    `,
  ],
};

export const Default = {
  args: {
    contentType: "short",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      ${getBodyContent(args.contentType)}
    </cds-aichat-workspace-shell-body>
  `,
};

export const LongContent = {
  args: {
    contentType: "long",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      ${getBodyContent(args.contentType)}
    </cds-aichat-workspace-shell-body>
  `,
};

export const WithCustomContent = {
  render: () => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <h3 style="margin-bottom: 1rem;">Custom Content Example</h3>
        <p style="margin-bottom: 1rem;">
          This body can contain any custom HTML or components. The content will
          automatically scroll if it exceeds the available height.
        </p>
        <div
          style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-top: 1rem;"
        >
          <div
            style="padding: 1rem; background: var(--cds-layer-01); border-radius: 4px;"
          >
            <h4 style="margin-bottom: 0.5rem;">Card 1</h4>
            <p>Custom card content</p>
          </div>
          <div
            style="padding: 1rem; background: var(--cds-layer-01); border-radius: 4px;"
          >
            <h4 style="margin-bottom: 0.5rem;">Card 2</h4>
            <p>Custom card content</p>
          </div>
          <div
            style="padding: 1rem; background: var(--cds-layer-01); border-radius: 4px;"
          >
            <h4 style="margin-bottom: 0.5rem;">Card 3</h4>
            <p>Custom card content</p>
          </div>
        </div>
      </div>
    </cds-aichat-workspace-shell-body>
  `,
};

export const EmptyState = {
  render: () => html`
    <cds-aichat-workspace-shell-body>
      <div
        style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 2rem; text-align: center;"
      >
        <h3 style="margin-bottom: 1rem;">No content available</h3>
        <p style="color: var(--cds-text-secondary);">
          This workspace is empty. Add content to get started.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
  `,
};

// Made with Bob
