/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../src/cds-aichat-shell";
import "../src/cds-aichat-panel";
import { html } from "lit";

const setPanelOpenState = (panelId, isOpen) => {
  const panel = document.getElementById(panelId);
  if (!panel) {
    return;
  }
  if (isOpen) {
    panel.setAttribute("open", "");
  } else {
    panel.removeAttribute("open");
  }
};

const slotContent = html`
  <div slot="header" class="header slot-sample">Header</div>
  <div slot="header-after" class="header-after slot-sample">Header after</div>
  <div slot="messages-before" class="messages-before slot-sample">
    Messages before
  </div>
  <div slot="messages-after" class="messages-after slot-sample">
    Messages after
  </div>
  <div slot="footer" class="footer slot-sample">Footer</div>
  <div slot="history" class="slot-sample">History</div>
  <div slot="workspace" class="workspace slot-sample">Workspace</div>
  <div slot="messages" class="messages slot-sample">Messages</div>
  <div slot="input-before" class="input-before slot-sample">Before input</div>
  <div slot="input" class="input slot-sample">Input</div>
  <div slot="input-after" class="input-after slot-sample">After input</div>
  <div slot="panels">
    <cds-aichat-panel
      id="panel-tertiary"
      show-chat-header
      show-frame
      animation-on-open="slide-in-from-bottom"
      animation-on-close="slide-out-to-bottom"
    >
      <div slot="body" class="slot-sample panel-sample">
        Slide in from bottom with frame while showing header<br />
        <small>Lowest priority panel.</small>
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel
      id="panel-tertiary-no-header"
      show-frame
      animation-on-open="slide-in-from-bottom"
      animation-on-close="slide-out-to-bottom"
    >
      <div slot="body" class="slot-sample panel-sample">
        Slide in from bottom with frame without header<br />
        <small>Alternate tertiary panel.</small>
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel
      id="panel-tertiary-full"
      show-chat-header
      show-frame
      full-width
      animation-on-open="slide-in-from-bottom"
      animation-on-close="slide-out-to-bottom"
    >
      <div slot="body" class="slot-sample panel-sample">
        Slide in from bottom full width with frame<br />
        <small>Lowest priority panel, full width.</small>
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel
      id="panel-tertiary-no-header-full"
      show-frame
      full-width
      animation-on-open="slide-in-from-bottom"
      animation-on-close="slide-out-to-bottom"
    >
      <div slot="body" class="slot-sample panel-sample">
        Slide in from bottom full width without header<br />
        <small>Alternate tertiary panel, full width.</small>
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel
      id="panel-secondary"
      priority="1"
      animation-on-open="fade-in"
      animation-on-close="fade-out"
      show-chat-header
    >
      <div slot="body" class="slot-sample panel-sample">
        Fade in with no frame while showing header<br />
        <small>Second highest priority</small>
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel id="panel-primary" priority="2">
      <div slot="body" class="slot-sample panel-sample">
        Immediate takeover
        <small>Highest priority</small>
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel id="panel-primary-full" priority="2" full-width>
      <div slot="body" class="slot-sample panel-sample">
        Immediate takeover (full width)
        <small>Highest priority, full width</small>
      </div>
    </cds-aichat-panel>
  </div>
`;

export default {
  title: "Components/Chat shell",
  args: {
    aiEnabled: false,
    showFrame: true,
    roundedCorners: true,
    showHeader: false,
    showHistory: false,
    showWorkspace: false,
    workspaceLocation: "start",
    historyLocation: "start",
  },
  argTypes: {
    aiEnabled: { control: "boolean" },
    showFrame: { control: "boolean" },
    roundedCorners: { control: "boolean" },
    showHeader: { control: "boolean" },
    showHistory: { control: "boolean" },
    showWorkspace: { control: "boolean" },
    workspaceLocation: {
      control: { type: "radio" },
      options: ["start", "end"],
    },
    historyLocation: {
      control: { type: "radio" },
      options: ["start", "end"],
    },
  },
  decorators: [
    (story) => html`
      <style>
        cds-aichat-shell {
          display: block;
          height: 512px;
          width: 100%;
        }

        .slot-sample {
          border: 1px dashed rgba(255, 0, 0, 0.4);
          text-align: center;
        }

        .messages,
        .workspace {
          block-size: 100%;
          inline-size: 100%;
        }

        .messages,
        .messages-before,
        .messages-after {
          background-color: rgba(255, 0, 0, 0.5);
        }

        .workspace {
          background-color: rgba(0, 0, 255, 0.5);
        }

        .input-before,
        .input,
        .input-after {
          background-color: rgba(0, 255, 0, 0.5);
        }

        .header,
        .header-after,
        .footer {
          background-color: rgba(255, 255, 0, 0.5);
        }

        [rounded-corners] .header.slot-sample {
          border-start-start-radius: 8px;
          border-start-end-radius: 8px;
          overflow: hidden;
        }

        [rounded-corners] .footer.slot-sample {
          border-end-start-radius: 8px;
          border-end-end-radius: 8px;
          overflow: hidden;
        }

        .panel-sample {
          border: 1px dashed rgba(255, 0, 0, 0.4);
          block-size: 100%;
          inline-size: 100%;
          text-align: center;
        }

        .panel-controls {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }
      </style>
      ${story()}
    `,
  ],
};

export const Default = {
  render: (args) => html`
    <div class="panel-controls">
      <button @click=${() => setPanelOpenState("panel-primary", true)}>
        Open primary panel
      </button>
      <button @click=${() => setPanelOpenState("panel-primary", false)}>
        Close primary panel
      </button>
      <button @click=${() => setPanelOpenState("panel-primary-full", true)}>
        Open primary (full width)
      </button>
      <button @click=${() => setPanelOpenState("panel-primary-full", false)}>
        Close primary (full width)
      </button>
      <button @click=${() => setPanelOpenState("panel-secondary", true)}>
        Open secondary panel
      </button>
      <button @click=${() => setPanelOpenState("panel-secondary", false)}>
        Close secondary panel
      </button>
      <button @click=${() => setPanelOpenState("panel-tertiary", true)}>
        Open tertiary panel
      </button>
      <button @click=${() => setPanelOpenState("panel-tertiary", false)}>
        Close tertiary panel
      </button>
      <button
        @click=${() => setPanelOpenState("panel-tertiary-no-header", true)}
      >
        Open tertiary (no header)
      </button>
      <button
        @click=${() => setPanelOpenState("panel-tertiary-no-header", false)}
      >
        Close tertiary (no header)
      </button>
      <button @click=${() => setPanelOpenState("panel-tertiary-full", true)}>
        Open tertiary (full width)
      </button>
      <button @click=${() => setPanelOpenState("panel-tertiary-full", false)}>
        Close tertiary (full width)
      </button>
      <button
        @click=${() => setPanelOpenState("panel-tertiary-no-header-full", true)}
      >
        Open tertiary no header (full width)
      </button>
      <button
        @click=${() =>
          setPanelOpenState("panel-tertiary-no-header-full", false)}
      >
        Close tertiary no header (full width)
      </button>
    </div>
    <cds-aichat-shell
      ?ai-enabled=${args.aiEnabled}
      ?show-frame=${args.showFrame}
      ?rounded-corners=${args.roundedCorners}
      ?show-header=${args.showHeader}
      ?show-history=${args.showHistory}
      ?show-workspace=${args.showWorkspace}
      workspace-location=${args.workspaceLocation}
      history-location=${args.historyLocation}
    >
      ${slotContent}
    </cds-aichat-shell>
  `,
};
