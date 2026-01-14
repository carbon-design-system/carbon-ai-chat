import React from "react";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
} from "../../../react/workspace-shell";
import Button from "../../../react/button";
import Icon from "../../../react/icon";
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
  },
  argTypes: {
    titleText: {
      control: "text",
      description: "Title text for the header",
    },
    subTitleText: {
      control: "text",
      description: "Subtitle text for the header",
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
    descriptionType: "none",
    showAction: false,
  },
  render: ({ titleText, subTitleText }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader titleText={titleText} subTitleText={subTitleText} />
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithDescription = {
  args: {
    titleText: "Project Analysis",
    subTitleText: "Q4 2024 Performance Review",
    descriptionType: "basic",
    showAction: false,
  },
  render: ({ titleText, subTitleText, descriptionType }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader titleText={titleText} subTitleText={subTitleText}>
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithTags = {
  args: {
    titleText: "Development Plan",
    subTitleText: "Sprint 23 - Feature Implementation",
    descriptionType: "withTags",
    showAction: false,
  },
  render: ({ titleText, subTitleText, descriptionType }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader titleText={titleText} subTitleText={subTitleText}>
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

export const WithAction = {
  args: {
    titleText: "Deployment Strategy",
    subTitleText: "Production Release v2.5.0",
    descriptionType: "basic",
    showAction: true,
  },
  render: ({ titleText, subTitleText, descriptionType, showAction }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader titleText={titleText} subTitleText={subTitleText}>
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button kind="tertiary" slot="header-action">
            Edit Plan <Icon icon={Edit16} slot="icon" />
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
    descriptionType: "withTags",
    showAction: true,
  },
  render: ({ titleText, subTitleText, descriptionType, showAction }) => (
    <WorkspaceShell>
      <WorkspaceShellHeader titleText={titleText} subTitleText={subTitleText}>
        {descriptionType !== "none" && getHeaderDescription(descriptionType)}
        {showAction && (
          <Button kind="tertiary" slot="header-action">
            Edit Plan <Icon icon={Edit16} slot="icon" />
          </Button>
        )}
      </WorkspaceShellHeader>
      <WorkspaceShellBody>{getBodyContent("short")}</WorkspaceShellBody>
    </WorkspaceShell>
  ),
};

// Made with Bob
