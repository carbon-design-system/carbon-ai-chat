/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "../index";
import { action } from "storybook/actions";
import { html } from "lit";
import { FooterActionList } from "./story-data";
import styles from "./story-styles.scss?lit";

export default {
  title: "Components/Workspace shell/Footer",
  component: "cds-aichat-workspace-shell-footer",
  parameters: {
    docs: {
      description: {
        component:
          "Footer section for the workspace shell, containing action buttons. Automatically handles responsive stacking and button ordering.",
      },
    },
  },
  argTypes: {
    actions: {
      control: "object",
      description:
        "Array of action button configurations. Each action can have: label, kind, disabled, icon, and payload properties.",
    },
    actionPreset: {
      control: {
        type: "select",
      },
      options: Object.keys(FooterActionList),
      description: "Select a predefined set of actions",
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
    actionPreset: "Single primary button",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <p>
          This is sample content to demonstrate the footer positioning. The
          footer will be pushed to the bottom of the workspace shell.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
    <cds-aichat-workspace-shell-footer
      @cds-aichat-workspace-shell-footer-clicked=${(e) =>
        action("footer-action")(e.detail)}
      .actions=${FooterActionList[args.actionPreset]}
    >
    </cds-aichat-workspace-shell-footer>
  `,
};

export const TwoButtons = {
  args: {
    actionPreset: "Two buttons",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <p>
          This is sample content to demonstrate the footer positioning. The
          footer will be pushed to the bottom of the workspace shell.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
    <cds-aichat-workspace-shell-footer
      @cds-aichat-workspace-shell-footer-clicked=${(e) =>
        action("footer-action")(e.detail)}
      .actions=${FooterActionList[args.actionPreset]}
    >
    </cds-aichat-workspace-shell-footer>
  `,
};

export const ThreeButtons = {
  args: {
    actionPreset: "Three buttons with one ghost",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <p>
          This is sample content to demonstrate the footer positioning. The
          footer will be pushed to the bottom of the workspace shell.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
    <cds-aichat-workspace-shell-footer
      @cds-aichat-workspace-shell-footer-clicked=${(e) =>
        action("footer-action")(e.detail)}
      .actions=${FooterActionList[args.actionPreset]}
    >
    </cds-aichat-workspace-shell-footer>
  `,
};

export const WithDisabled = {
  args: {
    actionPreset: "With disabled button",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <p>
          This is sample content to demonstrate the footer positioning. The
          footer will be pushed to the bottom of the workspace shell.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
    <cds-aichat-workspace-shell-footer
      @cds-aichat-workspace-shell-footer-clicked=${(e) =>
        action("footer-action")(e.detail)}
      .actions=${FooterActionList[args.actionPreset]}
    >
    </cds-aichat-workspace-shell-footer>
  `,
};

export const DangerActions = {
  args: {
    actionPreset: "Danger actions",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <p>
          This is sample content to demonstrate the footer positioning. The
          footer will be pushed to the bottom of the workspace shell.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
    <cds-aichat-workspace-shell-footer
      @cds-aichat-workspace-shell-footer-clicked=${(e) =>
        action("footer-action")(e.detail)}
      .actions=${FooterActionList[args.actionPreset]}
    >
    </cds-aichat-workspace-shell-footer>
  `,
};

export const Stacked = {
  parameters: {
    docs: {
      description: {
        story:
          "Footer automatically stacks buttons vertically on narrow viewports (< 671px). Resize the viewport to see the responsive behavior.",
      },
    },
    viewport: {
      defaultViewport: "mobile1",
    },
  },
  args: {
    actionPreset: "Three buttons with one ghost",
  },
  render: (args) => html`
    <cds-aichat-workspace-shell-body>
      <div style="padding: 1rem;">
        <p>
          This is sample content to demonstrate the footer positioning. The
          footer will be pushed to the bottom of the workspace shell.
        </p>
      </div>
    </cds-aichat-workspace-shell-body>
    <cds-aichat-workspace-shell-footer
      @cds-aichat-workspace-shell-footer-clicked=${(e) =>
        action("footer-action")(e.detail)}
      .actions=${FooterActionList[args.actionPreset]}
    >
    </cds-aichat-workspace-shell-footer>
  `,
};

// Made with Bob
