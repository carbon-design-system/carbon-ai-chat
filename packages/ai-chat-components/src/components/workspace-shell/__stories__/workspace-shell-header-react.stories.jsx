import React from "react";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
} from "../../../react/workspace-shell";
import { Button } from "@carbon/react";
import Edit16 from "@carbon/icons/es/edit/16.js";
import { getHeaderDescription, getBodyContent } from "./story-helper-react";
import "./story-styles.scss";

export default {
  title: "Components/Workspace shell/Header",
  component: WorkspaceShellHeader,
  parameters: {
    docs: {
      description: {
        component:
          "Header section for the workspace shell, containing title, subtitle, description, and optional action buttons.",
      },
    },
    controls: {
      exclude: /^(?!descriptionType|showAction$).*/,
    },
  },
  argTypes: {
    collapsible: {
      control: "boolean",
      description:
        "Whether the header can be collapsed/expanded. When true, header starts collapsed and can be toggled. When false, header is always fully expanded. Useful when you have a lot of header content or when workspaces are used in small form factors.",
    },
    descriptionType: {
      control: {
        type: "select",
      },
      options: {
        None: "none",
        "Basic text": "basic",
        "With Tags": "withTags",
      },
      description: "Type of description content to display",
    },
    showAction: {
      control: "boolean",
      description: "Whether to show the action button",
    },
  },
};

export const Default = {
  args: {
    titleText: "Workspace Title",
    subTitleText: "Workspace subtitle",
    collapsible: false,
    descriptionType: "none",
    showAction: false,
  },
  render: ({
    titleText,
    subTitleText,
    collapsible,
    descriptionType,
    showAction,
  }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader
        titleText={titleText}
        subTitleText={subTitleText}
        collapsible={collapsible}
      >
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button icon={Edit16} kind="tertiary" slot="header-action">
            Edit Plan
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithDescription = {
  args: {
    titleText: "Project Analysis",
    subTitleText: "Q4 2024 Performance Review",
    collapsible: false,
    descriptionType: "basic",
    showAction: false,
  },
  render: ({
    titleText,
    subTitleText,
    collapsible,
    descriptionType,
    showAction,
  }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader
        titleText={titleText}
        subTitleText={subTitleText}
        collapsible={collapsible}
      >
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button icon={Edit16} kind="tertiary" slot="header-action">
            Edit Plan
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithTags = {
  args: {
    titleText: "Development Plan",
    subTitleText: "Sprint 23 - Feature Implementation",
    collapsible: false,
    descriptionType: "withTags",
    showAction: false,
  },
  render: ({
    titleText,
    subTitleText,
    collapsible,
    descriptionType,
    showAction,
  }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader
        titleText={titleText}
        subTitleText={subTitleText}
        collapsible={collapsible}
      >
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button icon={Edit16} kind="tertiary" slot="header-action">
            Edit Plan
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithAction = {
  args: {
    titleText: "Deployment Strategy",
    subTitleText: "Production Release v2.5.0",
    collapsible: false,
    descriptionType: "basic",
    showAction: true,
  },
  render: ({
    titleText,
    subTitleText,
    collapsible,
    descriptionType,
    showAction,
  }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader
        titleText={titleText}
        subTitleText={subTitleText}
        collapsible={collapsible}
      >
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button icon={Edit16} kind="tertiary" slot="header-action">
            Edit Plan
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const Complete = {
  args: {
    titleText: "Complete Header Example",
    subTitleText: "All features demonstrated",
    collapsible: false,
    descriptionType: "withTags",
    showAction: true,
  },
  render: ({
    titleText,
    subTitleText,
    collapsible,
    descriptionType,
    showAction,
  }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader
        titleText={titleText}
        subTitleText={subTitleText}
        collapsible={collapsible}
      >
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button icon={Edit16} kind="tertiary" slot="header-action">
            Edit Plan
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const Collapsible = {
  args: {
    titleText: "Collapsible Header",
    subTitleText: "Click title to expand/collapse",
    collapsible: true,
    descriptionType: "basic",
    showAction: true,
  },
  render: ({
    titleText,
    subTitleText,
    collapsible,
    descriptionType,
    showAction,
  }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader
        titleText={titleText}
        subTitleText={subTitleText}
        collapsible={collapsible}
      >
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button icon={Edit16} kind="tertiary" slot="header-action">
            Edit Plan
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

// Made with Bob
