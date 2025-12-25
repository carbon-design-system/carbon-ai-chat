/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, PropertyValues, html, nothing } from "lit";
import { property } from "lit/decorators.js";
// @ts-ignore
import styles from "./cds-aichat-shell.scss?lit";
import { PanelManager } from "./panel-manager.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import "./cds-aichat-panel.js";

type StartOrEnd = "start" | "end";
const MESSAGES_MIN_WIDTH_FALLBACK = 320;
const WORKSPACE_MIN_WIDTH_FALLBACK = 480;

@carbonElement(`cds-aichat-shell`)
class CdsAiChatShell extends LitElement {
  static styles = styles;

  @property({ type: Boolean, attribute: "ai-enabled", reflect: true })
  aiEnabled = false;

  @property({ type: Boolean, attribute: "show-frame", reflect: true })
  showFrame = false;

  @property({ type: Boolean, attribute: "rounded-corners", reflect: true })
  roundedCorners = false;

  @property({ type: Boolean, attribute: "show-header", reflect: true })
  showHeader = false;

  @property({ type: Boolean, attribute: "show-history", reflect: true })
  showHistory = false;

  @property({ type: Boolean, attribute: "show-workspace", reflect: true })
  showWorkspace = false;

  @property({ type: String, attribute: "workspace-location", reflect: true })
  workspaceLocation: StartOrEnd = "start";

  @property({ type: String, attribute: "history-location", reflect: true })
  historyLocation: StartOrEnd = "start";

  private panelManager?: PanelManager;
  private headerResizeObserver?: ResizeObserver;
  private hostResizeObserver?: ResizeObserver;
  private workspaceInPanel = false;
  private workspaceContentVisible = true;
  private expectWorkspaceExpansion = false;
  private expansionNoMovementTimer?: number;
  private expansionQuietTimer?: number;
  private expansionLastInlineSize?: number;

  render() {
    const widgetClasses = [
      "shell",
      this.aiEnabled ? "ai-theme" : "",
      this.showFrame ? "" : "frameless",
      this.roundedCorners ? "rounded" : "",
    ]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${widgetClasses}>
        <div class="main-chat">
          <div class="header-with-header-after">
            ${this.showHeader
              ? html`<div
                  class="header"
                  part="slot-header"
                  data-panel-slot="header"
                >
                  <slot name="header"></slot>
                </div>`
              : nothing}
            <div
              class="header-after"
              part="slot-header-after"
              data-panel-slot="header-after"
            >
              <slot name="header-after"></slot>
            </div>
          </div>
          <div class="main-content">
            <div class="main-content-body">
              ${
                /* this.showHistory
                ? html`<div
                    class="history"
                    part="slot-history"
                    data-panel-slot="history"
                  >
                    <slot name="history"></slot>
                  </div>`
                : nothing */ nothing
              }
              ${this.showWorkspace && !this.workspaceInPanel
                ? html`<div
                    class="workspace"
                    part="slot-workspace"
                    data-panel-slot="workspace"
                  >
                    <div
                      class=${this.workspaceContentVisible
                        ? "workspace-content"
                        : "workspace-content workspace-content--hidden"}
                      ?inert=${!this.workspaceContentVisible}
                    >
                      <slot name="workspace"></slot>
                    </div>
                  </div>`
                : nothing}
              <div class="input-and-messages">
                <div
                  class="messages-before"
                  part="slot-messages-before"
                  data-panel-slot="messages-before"
                >
                  <slot name="messages-before"></slot>
                </div>
                <div
                  class="messages"
                  part="slot-messages"
                  data-panel-slot="messages"
                >
                  <slot name="messages"></slot>
                </div>
                <div
                  class="messages-after"
                  part="slot-messages-after"
                  data-panel-slot="messages-after"
                >
                  <slot name="messages-after"></slot>
                </div>
                <div
                  class="input-before"
                  part="slot-input-before"
                  data-panel-slot="input-before"
                >
                  <slot name="input-before"></slot>
                </div>
                <div class="input" part="slot-input" data-panel-slot="input">
                  <slot name="input"></slot>
                </div>
                <div
                  class="input-after"
                  part="slot-input-after"
                  data-panel-slot="input-after"
                >
                  <slot name="input-after"></slot>
                </div>
              </div>
            </div>
            <div class="footer" part="slot-footer" data-panel-slot="footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
        <div class="panels open" part="slot-panels">
          ${this.showWorkspace && this.workspaceInPanel
            ? html`<cds-aichat-panel
                data-internal-panel
                open
                priority="0"
                full-width
                show-chat-header
                animation-on-open="slide-in-from-bottom"
                animation-on-close="slide-out-to-bottom"
                ?rounded-corners=${this.roundedCorners}
              >
                <div class="panel-body" slot="body">
                  <slot name="workspace"></slot>
                </div>
              </cds-aichat-panel>`
            : nothing}
          <slot name="panels"></slot>
        </div>
      </div>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const panelsSlot = this.renderRoot.querySelector<HTMLSlotElement>(
      'slot[name="panels"]',
    );

    if (!panelsSlot) {
      return;
    }

    const widgetRoot = this.renderRoot.querySelector<HTMLElement>(".shell");

    if (!widgetRoot) {
      return;
    }

    this.panelManager = new PanelManager(panelsSlot, widgetRoot);
    this.panelManager.connect();

    this.observeHeaderHeight();
    this.observeHostWidth();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    if (changedProperties.has("showWorkspace")) {
      if (this.showWorkspace) {
        this.observeHostWidth();
        this.handleShowWorkspaceEnabled();
      } else {
        this.setWorkspaceInPanel(false);
        this.hostResizeObserver?.disconnect();
        this.hostResizeObserver = undefined;
        this.setWorkspaceContentVisible(true);
        this.clearExpansionTimers();
        this.expectWorkspaceExpansion = false;
      }
    }

    this.panelManager?.refresh();
  }

  disconnectedCallback() {
    this.panelManager?.disconnect();
    this.headerResizeObserver?.disconnect();
    this.hostResizeObserver?.disconnect();
    this.clearExpansionTimers();
    super.disconnectedCallback();
  }

  private observeHeaderHeight() {
    const headerWrapper = this.renderRoot.querySelector<HTMLElement>(
      ".header-with-header-after",
    );

    if (!headerWrapper || typeof ResizeObserver === "undefined") {
      return;
    }

    const updateHeight = (height: number) => {
      this.style.setProperty("--cds-aichat--header-height", `${height}px`);
    };

    const measure = () => {
      const rect = headerWrapper.getBoundingClientRect();
      updateHeight(rect.height);
    };

    this.headerResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.target !== headerWrapper) {
          continue;
        }
        const borderBoxSize = Array.isArray(entry.borderBoxSize)
          ? entry.borderBoxSize[0]
          : entry.borderBoxSize;
        if (borderBoxSize?.blockSize) {
          updateHeight(borderBoxSize.blockSize);
        } else {
          updateHeight(entry.contentRect.height);
        }
      }
    });

    this.headerResizeObserver.observe(headerWrapper);
    measure();
  }

  private observeHostWidth() {
    if (typeof ResizeObserver === "undefined") {
      return;
    }

    if (!this.showWorkspace) {
      this.setWorkspaceInPanel(false);
      this.hostResizeObserver?.disconnect();
      this.hostResizeObserver = undefined;
      return;
    }

    if (!this.hostResizeObserver) {
      this.hostResizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          this.handleHostResize(this.getInlineSizeFromEntry(entry));
        }
      });
    } else {
      this.hostResizeObserver.disconnect();
    }

    this.hostResizeObserver.observe(this);
    this.handleHostResize(this.getBoundingClientRect().width);
  }

  private setWorkspaceInPanel(inPanel: boolean) {
    if (this.workspaceInPanel === inPanel) {
      return;
    }

    this.workspaceInPanel = inPanel;
    this.toggleAttribute("workspace-in-panel", inPanel);
    this.requestUpdate();
  }

  private updateWorkspaceInPanelState(inlineSize: number) {
    if (!Number.isFinite(inlineSize)) {
      return;
    }

    if (!this.showWorkspace) {
      this.setWorkspaceInPanel(false);
      return;
    }

    const workspaceMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-workspace-min-width",
      WORKSPACE_MIN_WIDTH_FALLBACK,
    );
    const messagesMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-messages-min-width",
      MESSAGES_MIN_WIDTH_FALLBACK,
    );
    const sideBySideMinWidth = workspaceMinWidth + messagesMinWidth;

    this.setWorkspaceInPanel(inlineSize < sideBySideMinWidth);
  }

  private handleHostResize(inlineSize: number) {
    if (this.expectWorkspaceExpansion) {
      this.trackExpectedExpansion(inlineSize);
      return;
    }

    this.updateWorkspaceInPanelState(inlineSize);
  }

  private handleShowWorkspaceEnabled() {
    const inlineSize = this.getBoundingClientRect().width;
    const sideBySideMinWidth = this.getSideBySideMinWidth();
    const canGrow =
      typeof window !== "undefined" && window.innerWidth >= sideBySideMinWidth;

    // Already wide enough: show immediately.
    if (inlineSize >= sideBySideMinWidth) {
      this.setWorkspaceContentVisible(true);
      this.expectWorkspaceExpansion = false;
      this.clearExpansionTimers();
      this.updateWorkspaceInPanelState(inlineSize);
      return;
    }

    // Host can't ever reach required size: go straight to panel.
    if (!canGrow) {
      this.setWorkspaceContentVisible(true);
      this.expectWorkspaceExpansion = false;
      this.clearExpansionTimers();
      this.setWorkspaceInPanel(true);
      return;
    }

    // Expecting the host to expand soon: render workspace shell empty, watch for movement.
    this.setWorkspaceContentVisible(false);
    this.expectWorkspaceExpansion = true;
    this.clearExpansionTimers();
    this.setWorkspaceInPanel(false);
    this.expansionNoMovementTimer = window.setTimeout(() => {
      this.finishWorkspaceExpansion(false);
    }, 100);
  }

  private trackExpectedExpansion(inlineSize: number) {
    if (!Number.isFinite(inlineSize)) {
      return;
    }

    this.expansionLastInlineSize = inlineSize;
    if (this.expansionNoMovementTimer) {
      clearTimeout(this.expansionNoMovementTimer);
      this.expansionNoMovementTimer = undefined;
    }

    if (this.expansionQuietTimer) {
      clearTimeout(this.expansionQuietTimer);
      this.expansionQuietTimer = undefined;
    }

    this.expansionQuietTimer = window.setTimeout(() => {
      this.finishWorkspaceExpansion(true);
    }, 100);
  }

  private finishWorkspaceExpansion(sawMovement: boolean) {
    const inlineSize =
      this.expansionLastInlineSize ?? this.getBoundingClientRect().width;

    this.expectWorkspaceExpansion = false;
    this.setWorkspaceContentVisible(true);
    this.clearExpansionTimers();

    if (!sawMovement) {
      this.setWorkspaceInPanel(true);
      return;
    }

    this.updateWorkspaceInPanelState(inlineSize);
  }

  private setWorkspaceContentVisible(visible: boolean) {
    if (this.workspaceContentVisible === visible) {
      return;
    }
    this.workspaceContentVisible = visible;
    this.requestUpdate();
  }

  private clearExpansionTimers() {
    if (this.expansionNoMovementTimer) {
      clearTimeout(this.expansionNoMovementTimer);
      this.expansionNoMovementTimer = undefined;
    }
    if (this.expansionQuietTimer) {
      clearTimeout(this.expansionQuietTimer);
      this.expansionQuietTimer = undefined;
    }
    this.expansionLastInlineSize = undefined;
  }

  private getSideBySideMinWidth() {
    const workspaceMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-workspace-min-width",
      WORKSPACE_MIN_WIDTH_FALLBACK,
    );
    const messagesMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-messages-min-width",
      MESSAGES_MIN_WIDTH_FALLBACK,
    );

    return workspaceMinWidth + messagesMinWidth;
  }

  private getInlineSizeFromEntry(entry: ResizeObserverEntry) {
    const borderBoxSize = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : entry.borderBoxSize;
    return borderBoxSize?.inlineSize ?? entry.contentRect.width;
  }

  private getCssLengthFromProperty(propertyName: string, fallback: number) {
    const value = getComputedStyle(this).getPropertyValue(propertyName).trim();
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }
}

export default CdsAiChatShell;
