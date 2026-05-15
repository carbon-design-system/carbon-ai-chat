/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-disable */
import React, { useState, useRef } from "react";

import ChatShell from "../../../react/chat-shell";
import ChatHeader from "../../../react/chat-header";
import {
  Button,
  ContentSwitcher,
  Switch,
  AILabel,
  AILabelContent,
  IconButton,
  Link,
  Tag,
} from "@carbon/react";
import {
  Close,
  Restart,
  Menu,
  ChevronLeft,
  Edit,
  Folders,
  FolderOpen,
  Launch,
  View,
} from "@carbon/icons-react";
import "./story-styles.scss";
import "@carbon/ai-chat/css/chat-explainability-popover.css";

const aiLabelBodyContent = (
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
        High level 1-2 sentence description of how the AI is being used in the
        UI.
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
            — <strong>Data type 1.</strong> Explain how it's used.
          </li>
          <li>
            — <strong>Data type 2.</strong> Explain how it's used.
          </li>
          <li>
            — <strong>Data type 3.</strong> Explain how it's used.
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
          Additional information about data used to fine tune and/or train the
          model
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
);

const aiLabelActions = (
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
);

const sampleActions = [
  {
    text: "Restart conversation",
    icon: Restart,
    onClick: () => console.log("Restart clicked"),
  },
  {
    text: "Close chat",
    icon: Close,
    onClick: () => console.log("Close clicked"),
    fixed: true,
  },
];

const sampleOverflowItems = [
  {
    text: "Settings",
    onClick: () => console.log("Settings clicked"),
  },
  {
    text: "Help",
    onClick: () => console.log("Help clicked"),
  },
  {
    text: "About",
    onClick: () => console.log("About clicked"),
  },
];

export default {
  title: "Preview/Chat shell/Header",
  args: {
    headerTitle: "title",
    headerName: "name",
  },
  argTypes: {
    headerTitle: {
      control: "text",
      description: "Main title text",
    },
    headerName: {
      control: "text",
      description: "Subtitle/name text",
    },
    fixedActions: {
      control: "select",
      options: ["content switcher", "custom button", "none"],
      mapping: {
        "content switcher": (
          <div slot="fixed-actions">
            <ContentSwitcher
              onChange={(e) => console.log(e)}
              selectionMode="automatic"
              selectedIndex={0}
              size="sm"
            >
              <Switch name="one" text="Code" />
              <Switch name="two" text="Preview" />
            </ContentSwitcher>
          </div>
        ),
        "custom button": (
          <div slot="fixed-actions">
            <Button
              onClick={() => console.log("Custom button clicked")}
              size="md"
            >
              Custom
            </Button>
          </div>
        ),
        none: undefined,
      },
      table: { category: "slot" },
      description:
        "Fixed actions slot for chat header component. `slot='fixed-actions'`",
    },
    aiLabel: {
      table: { category: "slot" },
      control: "boolean",
      description:
        "AI Label slot in the chat header component `slot='decorator'`",
    },
  },
};

export const Default = {
  args: {
    showActions: true,
    fixedActions: "none",
    aiLabel: false,
  },
  argTypes: {
    showActions: {
      control: "boolean",
      description: "Show or hide action buttons",
    },
  },
  render: (args) => {
    const actions = args.showActions ? sampleActions : [];
    return (
      <ChatShell>
        <ChatHeader
          slot="header"
          headerTitle={args.headerTitle}
          headerName={args.headerName}
          actions={actions}
        >
          {args.fixedActions}
          {args.aiLabel && (
            <div slot="decorator">
              <AILabel size="2xs" autoalign alignment="bottom">
                <AILabelContent>
                  {aiLabelBodyContent}
                  {aiLabelActions}
                </AILabelContent>
              </AILabel>
            </div>
          )}
        </ChatHeader>
        <div slot="messages" className="messages slot-sample">
          Messages
        </div>
        <div slot="input" className="input slot-sample">
          Input
        </div>
      </ChatShell>
    );
  },
};

export const WithOverflowNavigation = {
  args: {
    navigationOverflowLabel: "Menu",
    navigationOverflowAriaLabel: "Open menu",
    showActions: true,
    fixedActions: "none",
    aiLabel: false,
  },
  argTypes: {
    navigationOverflowLabel: {
      control: "text",
      description: "Label for overflow menu button",
    },
    navigationOverflowAriaLabel: {
      control: "text",
      description: "Aria label for overflow menu",
    },
    showActions: {
      control: "boolean",
      description: "Show or hide action buttons",
    },
  },
  render: (args) => {
    const actions = args.showActions ? sampleActions : [];
    return (
      <ChatShell>
        <ChatHeader
          slot="header"
          headerTitle={args.headerTitle}
          headerName={args.headerName}
          actions={actions}
          navigationType="overflow"
          navigationOverflowIcon={Menu}
          navigationOverflowLabel={args.navigationOverflowLabel}
          navigationOverflowAriaLabel={args.navigationOverflowAriaLabel}
          navigationOverflowItems={sampleOverflowItems}
        >
          {args.fixedActions}
          {args.aiLabel && (
            <div slot="decorator">
              <AILabel size="2xs" autoalign alignment="bottom">
                <AILabelContent>
                  {aiLabelBodyContent}
                  {aiLabelActions}
                </AILabelContent>
              </AILabel>
            </div>
          )}
        </ChatHeader>
        <div slot="messages" className="messages slot-sample">
          Messages
        </div>
        <div slot="input" className="input slot-sample">
          Input
        </div>
      </ChatShell>
    );
  },
};

export const WithFocusManagement = {
  args: {
    headerTitle: "title",
    headerName: "name",
    navigationType: "back",
    navigationBackLabel: "Back",
    showActions: true,
    overflow: false,
    fixedActions: "none",
    aiLabel: false,
  },
  render: (args) => {
    const headerRef = useRef(null);
    const actions = args.showActions ? sampleActions : [];

    const handleRequestFocus = () => {
      if (headerRef.current) {
        const success = headerRef.current.requestFocus();
        console.log("Focus request:", success ? "successful" : "failed");
      }
    };

    return (
      <div>
        <Button onClick={handleRequestFocus} style={{ marginBottom: "16px" }}>
          Request Focus on Header
        </Button>
        <ChatShell>
          <ChatHeader
            ref={headerRef}
            slot="header"
            headerTitle={args.headerTitle}
            headerName={args.headerName}
            actions={actions}
            overflow={args.overflow}
            navigationType={args.navigationType}
            navigationBackIcon={ChevronLeft}
            navigationBackLabel={args.navigationBackLabel}
            navigationBackOnClick={() => console.log("Back clicked")}
          >
            {args.fixedActions}
            {args.aiLabel && (
              <div slot="decorator">
                <AILabel size="2xs" autoalign alignment="bottom">
                  {aiLabelBodyContent}
                  {aiLabelActions}
                </AILabel>
              </div>
            )}
          </ChatHeader>
          <div slot="messages" className="messages slot-sample">
            Messages
          </div>
          <div slot="input" className="input slot-sample">
            Input
          </div>
        </ChatShell>
      </div>
    );
  },
};

// Made with Bob
