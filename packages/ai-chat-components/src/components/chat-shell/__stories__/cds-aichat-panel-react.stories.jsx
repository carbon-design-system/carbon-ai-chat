/* eslint-disable */
import React, { useState } from "react";

import ChatShell from "../../../react/chat-shell";
import ChatPanel from "../../../react/panel";
import { CardFooter } from "../../../react/card";
import { cardFooterPresets } from "../../card/__stories__/story-data.js";
import "./story-styles.scss";

// Core slots for panel stories
const CoreSlotContent = () => (
  <>
    <div slot="header" className="header slot-sample">
      Header
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
  title: "Components/Chat shell/Panels",
  argTypes: {
    aiEnabled: {
      control: "boolean",
      description: "Enable AI-specific theming for shell",
    },
    showFrame: {
      control: "boolean",
      description: "Show visual frame around shell content",
    },
    roundedCorners: {
      control: "boolean",
      description: "Apply rounded corners to shell frame",
    },
  },
};

export const Default = {
  args: {
    // Shell-level args
    aiEnabled: true,
    showFrame: true,
    roundedCorners: true,
    // Panel-specific args
    open: true,
    priority: 0,
    fullWidth: false,
    showChatHeader: true,
    showPanelFrame: true,
    animationOnOpen: "slide-in-from-bottom",
    animationOnClose: "slide-out-to-bottom",
  },
  argTypes: {
    // Panel-specific argTypes
    open: {
      control: "boolean",
      description: "Panel open state",
    },
    priority: {
      control: { type: "number", min: 0, max: 2, step: 1 },
      description: "Panel priority (higher priority panels display over lower)",
    },
    fullWidth: {
      control: "boolean",
      description: "Panel spans full width of chat interface",
    },
    showChatHeader: {
      control: "boolean",
      description: "Show chat header within panel",
    },
    showPanelFrame: {
      control: "boolean",
      description: "Show visual frame around panel content",
    },
    animationOnOpen: {
      control: { type: "select" },
      options: ["", "slide-in-from-bottom", "slide-in-from-right", "fade-in"],
      description: "Animation when panel opens",
    },
    animationOnClose: {
      control: { type: "select" },
      options: ["", "slide-out-to-bottom", "slide-out-to-right", "fade-out"],
      description: "Animation when panel closes",
    },
  },
  render: (args) => {
    const {
      aiEnabled,
      showFrame,
      roundedCorners,
      open,
      priority,
      fullWidth,
      showChatHeader,
      showPanelFrame,
      animationOnOpen,
      animationOnClose,
    } = args;

    return (
      <ChatShell
        aiEnabled={aiEnabled}
        showFrame={showFrame}
        roundedCorners={roundedCorners}
      >
        <CoreSlotContent />
        <div slot="panels">
          <ChatPanel
            open={open}
            priority={priority}
            fullWidth={fullWidth}
            showChatHeader={showChatHeader}
            showFrame={showPanelFrame}
            animationOnOpen={animationOnOpen || undefined}
            animationOnClose={animationOnClose || undefined}
          >
            <div slot="header">
              <h4>Panel Header</h4>
            </div>
            <div slot="body" className="panel-sample">
              <p>
                This is a configurable panel embedded in the chat shell. Use the
                controls to adjust panel properties and see how they affect the
                display.
              </p>
              <p>
                Toggle the "open" control to see the panel's animation behavior.
              </p>
            </div>
            <CardFooter
              slot="footer"
              actions={cardFooterPresets["secondary primary buttons"]}
            />
          </ChatPanel>
        </div>
      </ChatShell>
    );
  },
};

// Panel configurations for the Embedded story
const panelConfigs = [
  {
    id: "panel-primary-full",
    label: "fullscreen takeover panel. (highest priority)",
    priority: 2,
    fullWidth: true,
    showChatHeader: false,
    showFrame: false,
    animationOnOpen: "",
    animationOnClose: "",
  },
  {
    id: "panel-tertiary-full",
    label: "fullscreen panel",
    priority: 0,
    fullWidth: true,
    showChatHeader: true,
    showFrame: true,
    animationOnOpen: "slide-in-from-bottom",
    animationOnClose: "slide-out-to-bottom",
  },
  {
    id: "panel-tertiary",
    label: "standard panel",
    priority: 0,
    fullWidth: false,
    showChatHeader: true,
    showFrame: true,
    animationOnOpen: "slide-in-from-bottom",
    animationOnClose: "slide-out-to-bottom",
  },
  {
    id: "panel-tertiary-no-header",
    label: "standard panel takeover panel",
    priority: 0,
    fullWidth: false,
    showChatHeader: false,
    showFrame: false,
    animationOnOpen: "slide-in-from-bottom",
    animationOnClose: "slide-out-to-bottom",
  },
];

export const Embedded = {
  args: {
    aiEnabled: false,
    showFrame: true,
    roundedCorners: true,
  },
  render: (args) => {
    const { aiEnabled, showFrame, roundedCorners } = args;

    // State for each panel
    const [panelStates, setPanelStates] = useState(
      panelConfigs.reduce((acc, config) => {
        acc[config.id] = false;
        return acc;
      }, {}),
    );

    const togglePanel = (panelId) => {
      setPanelStates((prev) => ({
        ...prev,
        [panelId]: !prev[panelId],
      }));
    };

    return (
      <>
        <div className="panel-controls">
          <p>
            Toggle open/closed various example panels. Only one panel will be
            opened at a time. Which panel is opened will depend first on its
            "priority" attribute, and in the case of a priority tie, on the
            order in which the panels were opened.
          </p>
          {panelConfigs.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => togglePanel(id)}
              style={{
                backgroundColor: panelStates[id] ? "green" : "red",
                color: "white",
              }}
            >
              Toggle {label}
            </button>
          ))}
        </div>
        <ChatShell
          aiEnabled={aiEnabled}
          showFrame={showFrame}
          roundedCorners={roundedCorners}
        >
          <CoreSlotContent />
          <div slot="panels">
            {/* Standard panel */}
            <ChatPanel
              open={panelStates["panel-tertiary"]}
              priority={0}
              showChatHeader
              showFrame
              animationOnOpen="slide-in-from-bottom"
              animationOnClose="slide-out-to-bottom"
            >
              <div slot="header">
                <h4>Standard panel</h4>
              </div>
              <div slot="body" className="panel-sample">
                Slide in from bottom with frame while showing chat header
                <br />
                Lowest priority panel.
              </div>
            </ChatPanel>

            {/* Standard panel takeover */}
            <ChatPanel
              open={panelStates["panel-tertiary-no-header"]}
              priority={0}
              animationOnOpen="slide-in-from-bottom"
              animationOnClose="slide-out-to-bottom"
            >
              <div slot="header">
                <h4>Standard panel takeover panel</h4>
              </div>
              <div slot="body" className="panel-sample">
                Slide in from bottom without chat header or content frame
                <br />
                Lowest priority panel.
              </div>
            </ChatPanel>

            {/* Fullscreen panel */}
            <ChatPanel
              open={panelStates["panel-tertiary-full"]}
              priority={0}
              fullWidth
              showChatHeader
              showFrame
              animationOnOpen="slide-in-from-bottom"
              animationOnClose="slide-out-to-bottom"
            >
              <div slot="header" className="panel-sample">
                <h4>Fullscreen panel</h4>
              </div>
              <div slot="body" className="panel-sample">
                <p>
                  Slide in from bottom full width with frame. This panel
                  demonstrates all panel slots: header, body, and footer. These
                  slots are compatible with all panel views.
                </p>
              </div>
              <CardFooter
                slot="footer"
                actions={cardFooterPresets["secondary primary buttons"]}
              />
            </ChatPanel>

            {/* Fullscreen takeover panel (highest priority) */}
            <ChatPanel
              open={panelStates["panel-primary-full"]}
              priority={2}
              fullWidth
            >
              <div slot="header">
                <h4>Fullscreen takeover panel. (highest priority)</h4>
              </div>
              <div slot="body" className="panel-sample">
                No animation take over panel
                <br />
                Highest priority, full width
              </div>
            </ChatPanel>
          </div>
        </ChatShell>
      </>
    );
  },
};

// Made with Bob
