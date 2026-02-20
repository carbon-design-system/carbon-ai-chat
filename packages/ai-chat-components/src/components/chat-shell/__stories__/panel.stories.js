/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import "../src/shell.js";
import "../src/panel.js";
import "../../card/src/card-footer.js";
import { html, nothing } from "lit";
import styles from "./story-styles.scss?lit";
import { cardFooterPresets } from "../../card/__stories__/story-data.js";

const togglePanelOpenState = (panelId) => {
  const panel = document.getElementById(panelId);
  if (!panel) {
    return;
  }
  if (panel.hasAttribute("open")) {
    panel.removeAttribute("open");
  } else {
    panel.setAttribute("open", "");
  }

  // Update button color after toggling
  const button = document.querySelector(`button[data-panel-id="${panelId}"]`);
  if (button) {
    const isOpen = panel.hasAttribute("open");
    button.style.backgroundColor = isOpen ? "green" : "red";
  }
};

// Core slots for panel stories
const coreSlotContent = html`
  <div slot="header" class="header slot-sample">Header</div>
  <div slot="history" class="history slot-sample">History</div>
  <div slot="workspace" class="workspace slot-sample">Workspace</div>
  <div slot="messages" class="messages slot-sample">Messages</div>
  <div slot="input" class="input slot-sample">Input</div>
`;

// Panel definitions
const panelDefinitions = html`
  <div slot="panels">
    <cds-aichat-panel
      id="panel-tertiary"
      show-chat-header
      show-frame
      animation-on-open="slide-in-from-bottom"
      animation-on-close="slide-out-to-bottom"
    >
      <div slot="header"><h4>Standard panel</h4></div>
      <div slot="body" class="panel-sample">
        Slide in from bottom with frame while showing chat header<br />
        Lowest priority panel.
      </div>
    </cds-aichat-panel>
    <cds-aichat-panel
      id="panel-tertiary-no-header"
      animation-on-open="slide-in-from-bottom"
      animation-on-close="slide-out-to-bottom"
    >
      <div slot="header"><h4>Standard panel takeover panel</h4></div>
      <div slot="body" class="panel-sample">
        Slide in from bottom without chat header or content frame<br />
        Lowest priority panel.
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
      <div slot="header" class="panel-sample">
        <h4>Fullscreen panel</h4>
      </div>
      <div slot="body" class="panel-sample">
        <p>
          Slide in from bottom full width with frame. This panel demonstrates
          all panel slots: header, body, and footer. These slots are compatible
          with all panel views.
        </p>
      </div>
      <cds-aichat-card-footer
        slot="footer"
        .actions=${cardFooterPresets["secondary primary buttons"]}
      ></cds-aichat-card-footer>
    </cds-aichat-panel>
    <cds-aichat-panel id="panel-primary-full" priority="2" full-width>
      <div slot="header">
        <h4>Fullscreen takeover panel. (highest priority)</h4>
      </div>
      <div slot="body" class="panel-sample">
        No animation take over panel<br />
        Highest priority, full width
      </div>
    </cds-aichat-panel>
  </div>
`;

export default {
  title: "Components/Chat shell/Panels",
  args: {
    aiEnabled: false,
    showFrame: true,
    roundedCorners: true,
  },
  argTypes: {
    aiEnabled: { control: "boolean" },
    showFrame: { control: "boolean" },
    roundedCorners: { control: "boolean" },
  },
  decorators: [
    (story) => html`
      <style>
        ${styles}
      </style>
      ${story()}
    `,
  ],
};

const panelConfigs = [
  {
    id: "panel-primary-full",
    label: "fullscreen takeover panel. (highest priority)",
  },
  { id: "panel-tertiary-full", label: "fullscreen panel" },
  { id: "panel-tertiary", label: "standard panel" },
  { id: "panel-tertiary-no-header", label: "standard panel takeover panel" },
];

const createPanelButton = (panelId, label) => {
  const panel = document.getElementById(panelId);
  const isOpen = panel?.hasAttribute("open");
  const backgroundColor = isOpen ? "green" : "red";

  return html`
    <button
      data-panel-id="${panelId}"
      @click=${() => togglePanelOpenState(panelId)}
      style="background-color: ${backgroundColor}; color: white;"
    >
      Toggle ${label}
    </button>
  `;
};

export const Default = {
  args: {
    // Panel-specific args only
    open: true,
    priority: 0,
    fullWidth: false,
    showChatHeader: true,
    showFrame: true,
    aiEnabled: false,
    animationOnOpen: "slide-in-from-bottom",
    animationOnClose: "slide-out-to-bottom",
  },
  argTypes: {
    // Hide shell-level controls
    roundedCorners: { table: { disable: true } },
    // Panel-specific argTypes only
    open: { control: "boolean" },
    priority: {
      control: { type: "number", min: 0, max: 2, step: 1 },
    },
    fullWidth: { control: "boolean" },
    showChatHeader: { control: "boolean" },
    showFrame: { control: "boolean" },
    aiEnabled: { control: "boolean" },
    animationOnOpen: {
      control: { type: "select" },
      options: ["", "slide-in-from-bottom", "slide-in-from-right", "fade-in"],
    },
    animationOnClose: {
      control: { type: "select" },
      options: ["", "slide-out-to-bottom", "slide-out-to-right", "fade-out"],
    },
  },
  render: (args) => {
    const {
      open,
      priority,
      fullWidth,
      showChatHeader,
      showFrame,
      aiEnabled,
      animationOnOpen,
      animationOnClose,
    } = args;

    return html`
      <cds-aichat-shell ai-enabled show-frame rounded-corners>
        ${coreSlotContent}
        <div slot="panels">
          <cds-aichat-panel
            ?open=${open}
            priority=${priority}
            ?full-width=${fullWidth}
            ?show-chat-header=${showChatHeader}
            ?show-frame=${showFrame}
            ?ai-enabled=${aiEnabled}
            animation-on-open=${animationOnOpen || nothing}
            animation-on-close=${animationOnClose || nothing}
          >
            <div slot="header"><h4>Panel Header</h4></div>
            <div slot="body" class="panel-sample">
              <p>
                This is a configurable panel embedded in the chat shell. Use the
                controls to adjust panel properties and see how they affect the
                display.
              </p>
              <p>
                Toggle the "open" control to see the panel's animation behavior.
              </p>
            </div>
            <cds-aichat-card-footer
              slot="footer"
              .actions=${cardFooterPresets["secondary primary buttons"]}
            ></cds-aichat-card-footer>
          </cds-aichat-panel>
        </div>
      </cds-aichat-shell>
    `;
  },
};

export const Embedded = {
  render: (args) => {
    const { aiEnabled, showFrame, roundedCorners } = args;

    return html`
      <div class="panel-controls">
        <p>
          Toggle open/closed various example panels. Only one panel will be
          opened at a time. Which panel is opened will depend first on its
          "priority" attribute, and in the case of a priority tie, on the order
          in which the panels were opened.
        </p>
        ${panelConfigs.map(({ id, label }) => createPanelButton(id, label))}
      </div>
      <cds-aichat-shell
        ?ai-enabled=${aiEnabled}
        ?show-frame=${showFrame}
        ?rounded-corners=${roundedCorners}
      >
        ${coreSlotContent} ${panelDefinitions}
      </cds-aichat-shell>
    `;
  },
};

// Made with Bob
