/* eslint-disable */
import React, { useState, useRef } from "react";

import ChatShell from "../../../react/chat-shell";
import ChatHeader from "../../../react/chat-header";
import { Button, ContentSwitcher, Switch, AILabel } from "@carbon/react";
import {
  Close,
  Restart,
  OverflowMenuVertical,
  ChevronLeft,
} from "@carbon/icons-react";
import "./story-styles.scss";

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
  title: "Components/Chat shell/Header",
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
            <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
              <div slot="body-text">
                <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
                <div>
                  IBM watsonx is powered by the latest AI models to
                  intelligently process conversations and provide help whenever
                  and wherever you may need it.
                </div>
              </div>
            </AILabel>
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
          navigationOverflowIcon={OverflowMenuVertical}
          navigationOverflowLabel={args.navigationOverflowLabel}
          navigationOverflowAriaLabel={args.navigationOverflowAriaLabel}
          navigationOverflowItems={sampleOverflowItems}
        >
          {args.fixedActions}
          {args.aiLabel && (
            <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
              <div slot="body-text">
                <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
                <div>
                  IBM watsonx is powered by the latest AI models to
                  intelligently process conversations and provide help whenever
                  and wherever you may need it.
                </div>
              </div>
            </AILabel>
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
              <AILabel size="2xs" autoalign alignment="bottom" slot="decorator">
                <div slot="body-text">
                  <h4 className="margin-bottom-05">Powered by IBM watsonx</h4>
                  <div>
                    IBM watsonx is powered by the latest AI models to
                    intelligently process conversations and provide help
                    whenever and wherever you may need it.
                  </div>
                </div>
              </AILabel>
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
