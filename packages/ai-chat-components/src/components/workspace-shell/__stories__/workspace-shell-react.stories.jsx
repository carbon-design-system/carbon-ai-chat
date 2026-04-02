import React from "react";
import Toolbar from "../../../react/toolbar";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "../../../react/workspace-shell";
import { Edit } from "@carbon/icons-react";
import { AILabel, InlineNotification, Button } from "@carbon/react";
import { action } from "storybook/actions";
import { getHeaderDescription, getBodyContent } from "./story-helper-react";
import { actionLists, FooterActionList } from "./story-data-react";
import "./story-styles.scss";

export default {
  title: "Components/Workspace shell",
  component: WorkspaceShell,
  argTypes: {
    toolbarTitle: {
      control: "text",
      description: "Title text for the Toolbar Component",
    },
    toolbarAction: {
      control: "select",
      options: Object.keys(actionLists),
      mapping: actionLists,
      description:
        "Select which predefined set of actions to render in the Toolbar component.",
    },
    toolbarOverflow: {
      control: "boolean",
      description:
        "Provides an option to overflow actions into an overflow menu when the cds-aichat-toolbar component is used in the toolbar slot.",
    },
    notificationTitle: {
      control: "text",
      description: "Title text for the Notification Component",
    },
    headerTitle: {
      control: "text",
      description: "Title text for the Header Component",
    },
    headerSubTitle: {
      control: "text",
      description: "SubTitle text for the Header Component",
    },
    headerDescription: {
      control: {
        type: "select",
      },
      options: ["basic", "withTags"],
      mapping: {
        basic: "basic",
        withTags: "withTags",
      },
      description: "Defines the type of description text in Header Component",
    },
    showHeaderAction: {
      control: "boolean",
      description: "Toggles whether header actions are shown",
    },
    autoCollapsibleHeader: {
      control: "boolean",
      description:
        "Enable automatic header collapsible behavior based on available space. Note: This prop is currently experimental and is subject to future changes.",
    },
    bodyContent: {
      control: {
        type: "select",
      },
      options: ["short", "long"],
      mapping: {
        short: "short",
        long: "long",
      },
      description: "Defines the content in Body Component",
    },
    footerAction: {
      control: {
        type: "select",
      },
      options: Object.keys(FooterActionList),
      description: "Defines the actions slot in Footer component ",
    },
  },
  decorators: [
    (Story) => (
      <div className="workspace-story-container">
        <Story />
      </div>
    ),
  ],
};
export const Default = {
  args: {
    toolbarTitle: "Title",
    toolbarAction: "Advanced list",
    toolbarOverflow: true,
    notificationTitle: "Title",
    notificationSubTitle: "Message",
    headerTitle: "Title",
    headerSubTitle: "Sub title",
    headerDescription: "withTags",
    showHeaderAction: true,
    autoCollapsibleHeader: false,
    bodyContent: "short",
    footerAction: "Three buttons with one ghost",
  },
  render: ({
    toolbarTitle,
    toolbarAction,
    toolbarOverflow,
    notificationTitle,
    notificationSubTitle,
    headerTitle,
    headerSubTitle,
    headerDescription,
    showHeaderAction,
    autoCollapsibleHeader,
    bodyContent,
    footerAction,
  }) => {
    return (
      <WorkspaceShell autoCollapsibleHeader={autoCollapsibleHeader}>
        <Toolbar
          slot="toolbar"
          actions={toolbarAction}
          overflow={toolbarOverflow}
          titleText={toolbarTitle}
        >
          <AILabel
            size="2xs"
            autoalign
            alignment="bottom"
            slot="toolbar-ai-label"
          >
            <div slot="body-text">
              <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
              <div>
                IBM watsonx is powered by the latest AI models to intelligently
                process conversations and provide help whenever and wherever you
                may need it.
              </div>
            </div>
          </AILabel>
        </Toolbar>
        <InlineNotification
          slot="notification"
          title={notificationTitle}
          subtitle={notificationSubTitle}
          kind="warning"
          hideCloseButton
        ></InlineNotification>
        <WorkspaceShellHeader
          titleText={headerTitle}
          subTitleText={headerSubTitle}
        >
          {getHeaderDescription(headerDescription)}
          {showHeaderAction && (
            <Button kind="tertiary" slot="header-action" renderIcon={Edit}>
              Edit Plan
            </Button>
          )}
        </WorkspaceShellHeader>
        <WorkspaceShellBody>{getBodyContent(bodyContent)}</WorkspaceShellBody>
        {footerAction !== "None" && (
          <WorkspaceShellFooter
            onFooterClicked={(data) => action("action")(data)}
            actions={FooterActionList[footerAction]}
          ></WorkspaceShellFooter>
        )}
      </WorkspaceShell>
    );
  },
};
