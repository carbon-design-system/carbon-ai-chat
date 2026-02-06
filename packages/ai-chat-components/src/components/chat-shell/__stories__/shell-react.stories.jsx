/* eslint-disable */
import React, { useState } from "react";

import ChatShell from "../../../react/chat-shell";
import Toolbar from "../../../react/toolbar";
import "./story-styles.scss";

// Core slot content for stories
const CoreSlotContent = () => (
  <>
    <div slot="header">
      <Toolbar>
        <div slot="title">Header</div>
      </Toolbar>
    </div>
    <div slot="history" className="history slot-sample">
      History
    </div>
    <div slot="workspace" className="workspace slot-sample">
      Workspace
    </div>
    <div slot="messages" className="messages slot-sample">
      Messages
    </div>
    <div slot="input" className="input slot-sample">
      Input
    </div>
  </>
);

export default {
  title: "Components/Chat shell",
  argTypes: {
    aiEnabled: {
      control: "boolean",
      description: "Enable AI-specific theming",
    },
    showFrame: {
      control: "boolean",
      description: "Show visual frame around content",
    },
    roundedCorners: {
      control: "boolean",
      description: "Apply rounded corners to frame",
    },
    showHistory: {
      control: "boolean",
      description: "Show history sidebar",
    },
    showWorkspace: {
      control: "boolean",
      description: "Show workspace sidebar",
    },
    workspaceLocation: {
      control: { type: "radio" },
      options: ["start", "end"],
      description: "Position of workspace sidebar",
    },
    historyLocation: {
      control: { type: "radio" },
      options: ["start", "end"],
      description: "Position of history sidebar",
    },
  },
};

export const Default = {
  args: {
    aiEnabled: false,
    showFrame: true,
    roundedCorners: true,
    showHistory: false,
    showWorkspace: false,
    workspaceLocation: "start",
    historyLocation: "start",
  },
  render: (args) => {
    const {
      aiEnabled,
      showFrame,
      roundedCorners,
      showHistory,
      showWorkspace,
      workspaceLocation,
      historyLocation,
    } = args;

    return (
      <ChatShell
        aiEnabled={aiEnabled}
        showFrame={showFrame}
        roundedCorners={roundedCorners}
        showHistory={showHistory}
        showWorkspace={showWorkspace}
        workspaceLocation={workspaceLocation}
        historyLocation={historyLocation}
      >
        <CoreSlotContent />
      </ChatShell>
    );
  },
};

// Slot configuration definitions
const SLOT_CONFIGS = [
  { name: "header", label: "Header", hasCheckbox: true },
  { name: "header-after", label: "Header after", hasCheckbox: true },
  { name: "messages", label: "Messages", hasCheckbox: true },
  { name: "input-before", label: "Input before", hasCheckbox: true },
  { name: "input", label: "Input", hasCheckbox: true },
  { name: "input-after", label: "Input after", hasCheckbox: true },
  { name: "footer", label: "Footer", hasCheckbox: true },
  { name: "history", label: "History", hasCheckbox: false },
  { name: "workspace", label: "Workspace", hasCheckbox: false },
];

export const Slots = {
  args: {
    aiEnabled: false,
    showFrame: true,
    roundedCorners: true,
    showHistory: false,
    showWorkspace: false,
    workspaceLocation: "start",
    historyLocation: "start",
    messagesMaxWidth: "672px",
    messagesMinWidth: "320px",
    workspaceMinWidth: "640px",
    historyWidth: "320px",
  },
  argTypes: {
    messagesMaxWidth: {
      control: { type: "select" },
      options: ["480px", "560px", "672px", "800px", "960px"],
      description: "CSS custom property: --cds-aichat-messages-max-width",
      table: {
        category: "CSS Custom Properties",
        defaultValue: { summary: "672px" },
      },
    },
    messagesMinWidth: {
      control: { type: "select" },
      options: ["280px", "320px", "400px", "480px"],
      description: "CSS custom property: --cds-aichat-messages-min-width",
      table: {
        category: "CSS Custom Properties",
        defaultValue: { summary: "320px" },
      },
    },
    workspaceMinWidth: {
      control: { type: "select" },
      options: ["480px", "560px", "640px", "800px", "960px"],
      description: "CSS custom property: --cds-aichat-workspace-min-width",
      table: {
        category: "CSS Custom Properties",
        defaultValue: { summary: "640px" },
      },
    },
    historyWidth: {
      control: { type: "select" },
      options: ["256px", "320px", "400px", "480px"],
      description: "CSS custom property: --cds-aichat-history-width",
      table: {
        category: "CSS Custom Properties",
        defaultValue: { summary: "320px" },
      },
    },
  },
  render: (args) => {
    const {
      aiEnabled,
      showFrame,
      roundedCorners,
      showHistory,
      showWorkspace,
      workspaceLocation,
      historyLocation,
      messagesMaxWidth,
      messagesMinWidth,
      workspaceMinWidth,
      historyWidth,
    } = args;

    // Initialize slot visibility state
    const [slotVisibility, setSlotVisibility] = useState(
      SLOT_CONFIGS.reduce((acc, slot) => {
        acc[slot.name] = true;
        return acc;
      }, {}),
    );

    const [cssVars, setCssVars] = useState({
      messagesMaxWidth,
      messagesMinWidth,
      workspaceMinWidth,
      historyWidth,
    });

    const toggleSlot = (slotName) => {
      setSlotVisibility((prev) => ({
        ...prev,
        [slotName]: !prev[slotName],
      }));
    };

    return (
      <div className="story-container">
        <div className="slot-controls">
          <div className="control-section">
            <h4>Slot Visibility</h4>
            <div className="control-group">
              {SLOT_CONFIGS.filter((slot) => slot.hasCheckbox).map((slot) => (
                <label key={slot.name}>
                  <input
                    type="checkbox"
                    checked={slotVisibility[slot.name]}
                    onChange={() => toggleSlot(slot.name)}
                  />
                  {slot.label}
                </label>
              ))}
            </div>
          </div>
        </div>
        <ChatShell
          aiEnabled={aiEnabled}
          showFrame={showFrame}
          roundedCorners={roundedCorners}
          showHistory={showHistory}
          showWorkspace={showWorkspace}
          workspaceLocation={workspaceLocation}
          historyLocation={historyLocation}
          style={{
            "--cds-aichat-messages-max-width": cssVars.messagesMaxWidth,
            "--cds-aichat-messages-min-width": cssVars.messagesMinWidth,
            "--cds-aichat-workspace-min-width": cssVars.workspaceMinWidth,
            "--cds-aichat-history-width": cssVars.historyWidth,
          }}
        >
          {SLOT_CONFIGS.map((slot) =>
            slotVisibility[slot.name] ? (
              <div
                key={slot.name}
                slot={slot.name}
                className={`${slot.name} slot-sample`}
              >
                {slot.label}
              </div>
            ) : null,
          )}
        </ChatShell>
      </div>
    );
  },
};

export const SidebarWorkspace = {
  args: {
    aiEnabled: false,
    showFrame: true,
    roundedCorners: true,
    workspaceLocation: "start",
  },
  argTypes: {
    showHistory: { control: false, table: { disable: true } },
    historyLocation: { control: false, table: { disable: true } },
    showWorkspace: { control: false, table: { disable: true } },
  },
  render: (args) => {
    const { aiEnabled, showFrame, roundedCorners, workspaceLocation } = args;
    const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

    return (
      <ChatShell
        className={`sidebar-workspace-shell ${isWorkspaceOpen ? "expanded" : ""}`}
        aiEnabled={aiEnabled}
        showFrame={showFrame}
        roundedCorners={roundedCorners}
        showWorkspace={isWorkspaceOpen}
        workspaceLocation={workspaceLocation}
      >
        <div slot="header" className="header slot-sample">
          Chat Header
        </div>
        <div slot="messages" className="messages slot-sample">
          <div className="messages-content">
            <p>Messages area</p>
            <button
              className="workspace-toggle-btn"
              onClick={() => setIsWorkspaceOpen(!isWorkspaceOpen)}
            >
              {isWorkspaceOpen ? "Close workspace" : "Open workspace"}
            </button>
          </div>
        </div>
        <div slot="workspace" className="workspace slot-sample">
          <div className="workspace-content">
            <div className="workspace-header">
              <h3>Workspace</h3>
              <button
                className="workspace-toggle-btn"
                onClick={() => setIsWorkspaceOpen(false)}
              >
                Close
              </button>
            </div>
            <div className="workspace-body">
              <p>Workspace content goes here</p>
              <p>This area can contain any additional tools or information.</p>
            </div>
          </div>
        </div>
        <div slot="input" className="input slot-sample">
          Input area
        </div>
      </ChatShell>
    );
  },
};
