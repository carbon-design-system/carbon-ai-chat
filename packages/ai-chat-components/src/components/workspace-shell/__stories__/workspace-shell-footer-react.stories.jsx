import React from "react";
import WorkspaceShell, {
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "../../../react/workspace-shell";
import { action } from "storybook/actions";
import { FooterActionList } from "./story-data";
import "./story-styles.scss";

const defaultBodyText = `This is sample content to demonstrate the footer positioning. The footer will be pushed to the bottom of the workspace shell. Shrink the workspace width below 671px to see the footer buttons stack vertically with primary actions appearing first.`;

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
    actionPreset: "Two buttons",
    onFooterClicked: (data) => action("footer-action")(data),
  },
  render: ({ actionPreset, onFooterClicked }) => (
    <WorkspaceShell>
      <WorkspaceShellBody>
        <p>{defaultBodyText}</p>
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
        <p>{defaultBodyText}</p>
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
        <p>{defaultBodyText}</p>
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
        <p>{defaultBodyText}</p>
      </WorkspaceShellBody>
      <WorkspaceShellFooter
        actions={FooterActionList[actionPreset]}
        onFooterClicked={onFooterClicked}
      />
    </WorkspaceShell>
  ),
};

// Made with Bob
