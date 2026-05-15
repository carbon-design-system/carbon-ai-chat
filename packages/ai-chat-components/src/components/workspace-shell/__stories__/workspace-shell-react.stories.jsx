/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";
import Toolbar from "../../../react/toolbar";
import WorkspaceShell, {
  WorkspaceShellHeader,
  WorkspaceShellBody,
  WorkspaceShellFooter,
} from "../../../react/workspace-shell";
import { Edit, Folders, FolderOpen, Launch, View } from "@carbon/icons-react";
import {
  AILabel,
  InlineNotification,
  Button,
  IconButton,
  Link,
  Tag,
} from "@carbon/react";
import { action } from "storybook/actions";
import { getHeaderDescription, getBodyContent } from "./story-helper-react";
import { actionLists, FooterActionList } from "./story-data-react";
import "./story-styles.scss";
import "@carbon/ai-chat/css/chat-explainability-popover.css";

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
            <div
              role="dialog"
              slot="body-text"
              className="cds-aichat-explainability-popover--content"
            >
              <header className="cds-aichat-explainability-popover--content__header">
                <div className="cds-aichat-explainability-popover--content__eyebrow-row">
                  <span className="cds-aichat-explainability-popover--content__label">
                    AI explained
                  </span>
                  <Tag
                    className="cds-aichat--header__slug-confidence"
                    size="sm"
                    type="outline"
                  >
                    Confidence: 89%
                  </Tag>
                </div>
                <h2 className="cds-aichat-explainability-popover--content__title">
                  Name of feature
                </h2>
                <p className="cds-aichat-explainability-popover--content__description">
                  High level 1-2 sentence description of how the AI is being
                  used in the UI.
                </p>
              </header>
              <section className="cds-aichat-explainability-popover--content__section">
                <div>
                  <h3>How it works</h3>
                  <ol>
                    <li>
                      1. <strong>Key word.</strong> Description of key word.
                    </li>
                    <li>
                      2. <strong>Key word.</strong> Description of key word.
                    </li>
                    <li>
                      3. <strong>Key word.</strong> Description of key word.
                    </li>
                  </ol>
                </div>
                <div>
                  <h3>Data types used</h3>
                  <ul>
                    <li>
                      — <strong>Data type 1.</strong> Explain how it&apos;s
                      used.
                    </li>
                    <li>
                      — <strong>Data type 2.</strong> Explain how it&apos;s
                      used.
                    </li>
                    <li>
                      — <strong>Data type 3.</strong> Explain how it&apos;s
                      used.
                    </li>
                  </ul>
                </div>
              </section>
              <section className="cds-aichat-explainability-popover--content__section">
                <div>
                  <h3>AI model</h3>
                  <Link
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Launch slot="icon" size={16} /> granite.13b.v2.instruct
                  </Link>
                </div>
                <div>
                  <h4>Additional details</h4>
                  <p>
                    Additional information about data used to fine tune and/or
                    train the model
                  </p>
                </div>
              </section>
              <section className="cds-aichat-explainability-popover--content__section">
                <div>
                  <h3>Training data set</h3>
                  <Link
                    href="https://example.com"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Launch slot="icon" size={16} /> IBM Security data piles
                  </Link>
                </div>
              </section>
            </div>
            <div className="cds-aichat-explainability-popover--actions">
              <IconButton slot="actions" size="lg" kind="ghost">
                <Folders slot="icon" />
                <span slot="tooltip-content">Folders</span>
              </IconButton>
              <IconButton slot="actions" size="lg" kind="ghost">
                <FolderOpen slot="icon" />
                <span slot="tooltip-content">Open Folder</span>
              </IconButton>
              <IconButton slot="actions" size="lg" kind="ghost">
                <View slot="icon" />
                <span slot="tooltip-content">View</span>
              </IconButton>
              <Button slot="actions">View details</Button>
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
