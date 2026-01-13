import React from "react";
import WorkspaceShell, {
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "../../../react/workspace-shell";
import { action } from "storybook/actions";
import { FooterActionList } from "./story-data";
import "./story-styles.scss";

export default {
  title: "Components/Workspace shell/Footer",
  component: WorkspaceShellFooter,
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
    onFooterClicked: {
      action: "onFooterClicked",
      table: { category: "events" },
      description: "Event fired when a footer button is clicked",
    },
  },
};

export const Default = {
  args: {
    actionPreset: "Single primary button",
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div className="story__body-content">
          <p>
            This is sample content to demonstrate the footer positioning. The
            footer will be pushed to the bottom of the workspace shell.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
};

export const TwoButtons = {
  args: {
    actionPreset: "Two buttons",
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div className="story__body-content">
          <p>
            This is sample content to demonstrate the footer positioning. The
            footer will be pushed to the bottom of the workspace shell.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
};

export const ThreeButtons = {
  args: {
    actionPreset: "Three buttons with one ghost",
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div className="story__body-content">
          <p>
            This is sample content to demonstrate the footer positioning. The
            footer will be pushed to the bottom of the workspace shell.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
};

export const WithDisabled = {
  args: {
    actionPreset: "With disabled button",
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div className="story__body-content">
          <p>
            This is sample content to demonstrate the footer positioning. The
            footer will be pushed to the bottom of the workspace shell.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
};

export const DangerActions = {
  args: {
    actionPreset: "Danger actions",
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div className="story__body-content">
          <p>
            This is sample content to demonstrate the footer positioning. The
            footer will be pushed to the bottom of the workspace shell.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
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
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <div className="story__body-content">
          <p>
            This is sample content to demonstrate the footer positioning. The
            footer will be pushed to the bottom of the workspace shell.
          </p>
        </div>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
};

// Made with Bob
