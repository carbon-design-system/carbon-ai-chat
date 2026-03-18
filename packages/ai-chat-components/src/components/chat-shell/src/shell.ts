/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LitElement, PropertyValues, html, nothing } from "lit";
import { property, state } from "lit/decorators.js";
// @ts-ignore
import commonStyles from "../../../globals/scss/common.scss?lit";
import styles from "./shell.scss?lit";
import { PanelManager } from "./panel-manager.js";
import { WorkspaceManager } from "./workspace-manager.js";
import { CornerManager } from "./corner-manager.js";
import { SlotObserver } from "./slot-observer.js";
import { InitializationManager } from "./initialization-manager.js";
import { ResizeObserverManager } from "./resize-observer-manager.js";
import { AriaAnnouncerManager } from "./aria-announcer-manager.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";
import type { StartOrEnd, SlotConfig } from "./types.js";
import "./panel.js";

@carbonElement(`${prefix}-shell`)
class CDSAIChatShell extends LitElement {
  static styles = [commonStyles, styles];

  /**
   * @internal
   */
  private static readonly OBSERVED_SLOTS: readonly SlotConfig[] = [
    { name: "header", stateKey: "hasHeaderContent" },
    { name: "header-after", stateKey: "hasHeaderAfterContent" },
    { name: "footer", stateKey: "hasFooterContent" },
    { name: "input-after", stateKey: "hasInputAfterContent" },
    { name: "input", stateKey: "hasInputContent" },
    { name: "input-before", stateKey: "hasInputBeforeContent" },
  ];

  /**
   * Enables AI-specific theming for the chat shell
   */
  @property({ type: Boolean, attribute: "ai-enabled", reflect: true })
  aiEnabled = false;

  /**
   * Shows a frame border around the chat shell
   */
  @property({ type: Boolean, attribute: "show-frame", reflect: true })
  showFrame = false;

  /**
   * Sets the corner style for all corners. Individual corner-* attributes override this value.
   * Values: "round" or "square". Defaults to "square".
   */
  @property({ type: String, attribute: "corner-all", reflect: true })
  cornerAll: "round" | "square" = "square";

  /**
   * Controls the start-start corner (top-left in LTR, top-right in RTL).
   * Values: "round" or "square". Overrides cornerAll if set.
   */
  @property({ type: String, attribute: "corner-start-start", reflect: true })
  cornerStartStart?: "round" | "square";

  /**
   * Controls the start-end corner (top-right in LTR, top-left in RTL).
   * Values: "round" or "square". Overrides cornerAll if set.
   */
  @property({ type: String, attribute: "corner-start-end", reflect: true })
  cornerStartEnd?: "round" | "square";

  /**
   * Controls the end-start corner (bottom-left in LTR, bottom-right in RTL).
   * Values: "round" or "square". Overrides cornerAll if set.
   */
  @property({ type: String, attribute: "corner-end-start", reflect: true })
  cornerEndStart?: "round" | "square";

  /**
   * Controls the end-end corner (bottom-right in LTR, bottom-left in RTL).
   * Values: "round" or "square". Overrides cornerAll if set.
   */
  @property({ type: String, attribute: "corner-end-end", reflect: true })
  cornerEndEnd?: "round" | "square";

  /**
   * Shows the history panel in the chat shell
   */
  @property({ type: Boolean, attribute: "show-history", reflect: true })
  showHistory = false;

  /**
   * Shows the workspace panel in the chat shell
   */
  @property({ type: Boolean, attribute: "show-workspace", reflect: true })
  showWorkspace = false;

  /**
   * Determines the location of the workspace panel ("start" or "end")
   */
  @property({ type: String, attribute: "workspace-location", reflect: true })
  workspaceLocation: StartOrEnd = "start";

  /**
   * Determines the location of the history panel ("start" or "end")
   */
  @property({ type: String, attribute: "history-location", reflect: true })
  historyLocation: StartOrEnd = "start";

  /**
   * ARIA label for the workspace region
   */
  @property({ type: String, attribute: "workspace-aria-label" })
  workspaceAriaLabel = "Workspace panel";

  /**
   * ARIA label for the history region
   */
  @property({ type: String, attribute: "history-aria-label" })
  historyAriaLabel = "Conversation history";

  /**
   * ARIA label for the messages region
   */
  @property({ type: String, attribute: "messages-aria-label" })
  messagesAriaLabel = "Chat messages";

  /**
   * Announcement text for when a panel opens
   */
  @property({ type: String, attribute: "panel-opened-announcement" })
  panelOpenedAnnouncement = "Panel opened";

  /**
   * Announcement text for when a panel closes
   */
  @property({ type: String, attribute: "panel-closed-announcement" })
  panelClosedAnnouncement = "Panel closed";

  /**
   * Announcement text for when workspace opens
   */
  @property({ type: String, attribute: "workspace-opened-announcement" })
  workspaceOpenedAnnouncement = "Workspace opened";

  /**
   * Announcement text for when workspace closes
   */
  @property({ type: String, attribute: "workspace-closed-announcement" })
  workspaceClosedAnnouncement = "Workspace closed, returned to chat";

  /**
   * Announcement text for when history becomes visible
   */
  @property({ type: String, attribute: "history-shown-announcement" })
  historyShownAnnouncement = "Conversation history is now visible";

  /**
   * Announcement text for when history becomes hidden
   */
  @property({ type: String, attribute: "history-hidden-announcement" })
  historyHiddenAnnouncement = "Conversation history is now hidden";

  /**
   * Constrains content to a maximum width. When false, input and related
   * slots will extend to full container width without max-width constraints.
   */
  @property({ type: Boolean, attribute: "content-max-width", reflect: true })
  contentMaxWidth = false;

  /**
   * @internal
   * Flag to track if the component is still initializing.
   * Used to hide content during initial layout calculations to prevent visible thrashing.
   */
  @state()
  private _isInitializing = true;

  /**
   * @internal
   */
  private panelManager?: PanelManager;

  /**
   * @internal
   */
  private workspaceManager?: WorkspaceManager;

  /**
   * @internal
   */
  private cornerManager?: CornerManager;

  /**
   * @internal
   */
  private slotObserver?: SlotObserver;

  /**
   * @internal
   */
  private initializationManager?: InitializationManager;

  /**
   * @internal
   */
  private resizeObserverManager?: ResizeObserverManager;

  /**
   * @internal
   */
  private ariaAnnouncerManager?: AriaAnnouncerManager;

  /**
   * @internal
   * Cached slot content state from SlotObserver
   */
  private hasHeaderContent = false;
  private hasHeaderAfterContent = false;
  private hasFooterContent = false;
  private hasInputAfterContent = false;
  private hasInputContent = false;
  private hasInputBeforeContent = false;

  /**
   * @internal
   */
  private inputAndMessagesAtMaxWidth = false;

  /**
   * @internal
   */
  private shouldRenderHistory = true;

  /**
   * @internal
   */
  private workspacePanelRendering = false;

  /**
   * @internal
   */
  private workspacePanelOpen = false;

  /**
   * @internal
   */
  private lastShouldRenderWorkspacePanel = false;

  /**
   * @internal
   */
  private workspacePanelOpenScheduled = false;

  /**
   * @internal
   */
  private workspacePanelOpenRafId: number | null = null;

  /**
   * @internal
   */
  private lastWorkspaceInPanel = false;

  /**
   * @internal
   */
  private lastWorkspaceContainerVisible = false;

  /**
   * @internal
   */
  private suppressWorkspacePanelOpenAnimation = false;

  /**
   * @internal
   */
  private suppressWorkspacePanelCloseAnimation = false;

  /**
   * Handles panel open events and announces to screen readers
   * @internal
   */
  private handlePanelOpen = (event: Event): void => {
    // Only announce for non-workspace panels (workspace has its own announcement)
    const target = event.target as HTMLElement;

    // Check if the event target is the internal workspace panel
    // or if it's a child of the internal panel
    if (target?.hasAttribute("data-internal-panel")) {
      return;
    }

    // Also check if the target is inside an internal panel
    const closestPanel = target?.closest?.(
      "cds-aichat-panel[data-internal-panel]",
    );
    if (closestPanel) {
      return;
    }

    this.ariaAnnouncerManager?.announce(this.panelOpenedAnnouncement);
  };

  /**
   * Handles panel close events and announces to screen readers
   * @internal
   */
  private handlePanelClose = (event: Event): void => {
    // Only announce for non-workspace panels (workspace has its own announcement)
    const target = event.target as HTMLElement;

    // Check if the event target is the internal workspace panel
    // or if it's a child of the internal panel
    if (target?.hasAttribute("data-internal-panel")) {
      return;
    }

    // Also check if the target is inside an internal panel
    const closestPanel = target?.closest?.(
      "cds-aichat-panel[data-internal-panel]",
    );
    if (closestPanel) {
      return;
    }

    this.ariaAnnouncerManager?.announce(this.panelClosedAnnouncement);
  };

  /**
   * Announces workspace opened to screen readers
   * @internal
   */
  private announceWorkspaceOpened(): void {
    this.ariaAnnouncerManager?.announce(this.workspaceOpenedAnnouncement);
  }

  /**
   * Announces workspace closed to screen readers
   * @internal
   */
  private announceWorkspaceClosed(): void {
    this.ariaAnnouncerManager?.announce(this.workspaceClosedAnnouncement);
  }

  /**
   * Handles workspace visibility changes from WorkspaceManager
   * @internal
   */
  private handleWorkspaceVisibilityChange = (
    visible: boolean,
    inPanel: boolean,
  ): void => {
    // Don't announce during initialization
    if (!this.initializationManager?.isInitializationComplete()) {
      return;
    }

    // For panel mode, syncWorkspacePanelState already handles announcements
    // Only announce for inline mode changes
    if (!inPanel) {
      // Add extra delay to allow button state changes to be announced first
      // This prevents the workspace announcement from being interrupted
      if (typeof window !== "undefined") {
        window.setTimeout(() => {
          if (visible) {
            this.ariaAnnouncerManager?.announce(
              this.workspaceOpenedAnnouncement,
            );
          } else {
            this.ariaAnnouncerManager?.announce(
              this.workspaceClosedAnnouncement,
            );
          }
        }, 100); // 100ms delay before queuing the announcement (which has its own 250ms delay)
      }
    }
  };

  private getWidgetClasses(): string {
    const workspaceState = this.workspaceManager?.getState();
    const hasAnyRoundedCorner =
      this.cornerAll === "round" ||
      this.cornerStartStart === "round" ||
      this.cornerStartEnd === "round" ||
      this.cornerEndStart === "round" ||
      this.cornerEndEnd === "round";
    return [
      "shell",
      this._isInitializing ? "initializing" : "",
      this.aiEnabled ? "ai-theme" : "",
      this.showFrame ? "" : "frameless",
      hasAnyRoundedCorner ? "rounded" : "",
      this.hasHeaderContent || this.hasHeaderAfterContent
        ? "has-header-content"
        : "",
      this.hasFooterContent ? "has-footer-content" : "",
      workspaceState?.isCheckingExpansion ? "workspace-checking" : "",
      workspaceState?.isContracting ? "workspace-closing" : "",
      workspaceState?.isExpanding ? "workspace-opening" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private getInputAndMessagesClasses(): string {
    return [
      "input-and-messages",
      this.hasInputBeforeContent ? "has-input-before-content" : "",
      this.hasInputContent ? "has-input-content" : "",
      this.hasInputAfterContent ? "has-input-after-content" : "",
      this.inputAndMessagesAtMaxWidth ? "at-max-width" : "",
    ]
      .filter(Boolean)
      .join(" ");
  }

  private renderSlot(name: string, className: string, condition = true) {
    if (!condition) {
      return nothing;
    }

    // Determine if this slot has content
    const hasContent = this.getSlotContentState(name);
    const classes = [className, hasContent ? "has-content" : ""]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${classes} part="slot-${name}" data-panel-slot=${name}>
        <slot name=${name}></slot>
      </div>
    `;
  }

  private getSlotContentState(slotName: string): boolean {
    switch (slotName) {
      case "header":
        return this.hasHeaderContent;
      case "header-after":
        return this.hasHeaderAfterContent;
      case "footer":
        return this.hasFooterContent;
      case "input-after":
        return this.hasInputAfterContent;
      case "input":
        return this.hasInputContent;
      case "input-before":
        return this.hasInputBeforeContent;
      case "messages":
        return true; // messages slot is always considered to have content
      default:
        return false;
    }
  }

  private renderWorkspaceInline() {
    const shouldRenderInline =
      this.workspaceManager?.shouldRenderInline() ?? false;
    const shouldSuppressInline =
      this.workspacePanelRendering && !this.workspacePanelOpen;

    if (!shouldRenderInline || shouldSuppressInline) {
      return nothing;
    }

    const workspaceState = this.workspaceManager?.getState();

    return html`
      <div
        class="workspace"
        part="slot-workspace"
        data-panel-slot="workspace"
        role="region"
        aria-label=${this.workspaceAriaLabel}
      >
        <div
          class=${workspaceState?.contentVisible
            ? "workspace-content"
            : "workspace-content workspace-content--hidden"}
          ?inert=${!workspaceState?.contentVisible}
        >
          <slot name="workspace"></slot>
        </div>
      </div>
    `;
  }

  private renderWorkspacePanel() {
    if (!this.workspacePanelRendering) {
      return nothing;
    }

    // When switching from container to panel view, don't animate
    // Only animate when opening from closed state
    const animationOnOpen = this.suppressWorkspacePanelOpenAnimation
      ? "none"
      : "slide-in-from-bottom";

    return html`
      <cds-aichat-panel
        data-internal-panel
        ?open=${this.workspacePanelOpen}
        full-width
        no-scroll
        show-chat-header
        body-no-padding
        animation-on-open=${animationOnOpen}
        animation-on-close=${this.suppressWorkspacePanelCloseAnimation
          ? "none"
          : "slide-out-to-bottom"}
        @closeend=${this.handleWorkspacePanelCloseEnd}
      >
        <div slot="body" class="workspace-slot">
          <slot name="workspace"></slot>
        </div>
      </cds-aichat-panel>
    `;
  }

  private renderHeader() {
    return html`
      <div class="header-with-header-after">
        ${this.renderHeaderSlot("header", "header")}
        ${this.renderHeaderSlot("header-after", "header-after")}
      </div>
    `;
  }

  private renderHeaderSlot(name: string, className: string) {
    const hasContent =
      name === "header"
        ? this.hasHeaderContent
        : name === "header-after"
          ? this.hasHeaderAfterContent
          : false;

    const classes = [className, hasContent ? "has-content" : ""]
      .filter(Boolean)
      .join(" ");

    return html`
      <div class=${classes} part="slot-${name}" data-panel-slot=${name}>
        <slot name=${name}></slot>
      </div>
    `;
  }

  private renderMessagesSection() {
    const maxWidthClass = this.contentMaxWidth ? "messages-max-width" : "";
    return html`
      <div
        class=${this.getInputAndMessagesClasses()}
        role="region"
        aria-label=${this.messagesAriaLabel}
      >
        ${this.renderSlot("messages", "messages")}
        ${this.renderSlot("input-before", `input-before ${maxWidthClass}`)}
        ${this.renderSlot("input", `input ${maxWidthClass}`)}
        ${this.renderSlot("input-after", `input-after ${maxWidthClass}`)}
      </div>
    `;
  }

  private renderHistory() {
    if (!this.showHistory || !this.shouldRenderHistory) {
      return nothing;
    }
    return html`<div
      class="history"
      role="region"
      aria-label=${this.historyAriaLabel}
    >
      ${this.renderSlot("history", "history")}
    </div>`;
  }

  render() {
    return html`
      <div class=${this.getWidgetClasses()}>
        <!-- Hidden aria-live regions for screen reader announcements -->
        <div
          class="visually-hidden"
          aria-live="polite"
          aria-atomic="true"
        ></div>
        <div
          class="visually-hidden"
          aria-live="polite"
          aria-atomic="true"
        ></div>
        <div class="main-chat">
          ${this.renderHeader()}
          <div class="main-content">
            <div class="main-content-body">
              ${this.renderHistory()} ${this.renderWorkspaceInline()}
              ${this.renderMessagesSection()}
            </div>
            ${this.renderSlot("footer", "footer")}
          </div>
        </div>
        <div class="panels open" part="slot-panels">
          ${this.renderWorkspacePanel()}
          <slot name="panels"></slot>
        </div>
      </div>
    `;
  }

  protected firstUpdated(changedProperties: PropertyValues) {
    super.firstUpdated(changedProperties);
    const widgetRoot = this.renderRoot.querySelector<HTMLElement>(".shell");
    if (!widgetRoot) {
      return;
    }

    // Initialize aria announcer manager
    const ariaLiveRegions = this.renderRoot.querySelectorAll<HTMLDivElement>(
      '[aria-live="polite"]',
    );
    if (ariaLiveRegions.length >= 2) {
      this.ariaAnnouncerManager = new AriaAnnouncerManager();
      this.ariaAnnouncerManager.connect(ariaLiveRegions[0], ariaLiveRegions[1]);
    }

    // Listen for panel open/close events
    this.addEventListener("openend", this.handlePanelOpen);
    this.addEventListener("closeend", this.handlePanelClose);

    // Initialize corner manager
    this.cornerManager = new CornerManager(widgetRoot, {
      cornerAll: this.cornerAll,
      cornerStartStart: this.cornerStartStart,
      cornerStartEnd: this.cornerStartEnd,
      cornerEndStart: this.cornerEndStart,
      cornerEndEnd: this.cornerEndEnd,
    });

    // Initialize initialization manager FIRST (before observers that use it)
    this.initializationManager = new InitializationManager();
    this.initializationManager.onComplete(() => {
      this._isInitializing = false;
      this.requestUpdate();
      // Enable workspace announcements after initialization is complete
      this.workspaceManager?.enableAnnouncements();
    });

    // Initialize slot observer
    this.slotObserver = new SlotObserver(
      this.renderRoot as ShadowRoot,
      CDSAIChatShell.OBSERVED_SLOTS,
    );
    this.slotObserver.connect(() => {
      // Update cached slot state
      const state = this.slotObserver?.getSlotContentState();
      this.hasHeaderContent = state?.hasHeaderContent || false;
      this.hasHeaderAfterContent = state?.hasHeaderAfterContent || false;
      this.hasFooterContent = state?.hasFooterContent || false;
      this.hasInputContent = state?.hasInputContent || false;
      this.hasInputAfterContent = state?.hasInputAfterContent || false;
      this.hasInputBeforeContent = state?.hasInputBeforeContent || false;

      // Mark initialization complete
      this.initializationManager?.markStateSet("hasSlotContent");

      this.requestUpdate();
    });

    // Initialize resize observer manager
    this.resizeObserverManager = new ResizeObserverManager(
      this.renderRoot as ShadowRoot,
      this,
    );

    // Observe header height
    this.resizeObserverManager.observeHeaderHeight((height) => {
      widgetRoot.style.setProperty("--cds-aichat-header-height", `${height}px`);
    });

    // Observe input and messages width
    this.resizeObserverManager.observeInputAndMessagesWidth(
      ({ isAtMaxWidth }) => {
        if (this.inputAndMessagesAtMaxWidth !== isAtMaxWidth) {
          this.inputAndMessagesAtMaxWidth = isAtMaxWidth;
          this.requestUpdate();
        }
      },
      () => {
        // Initial measurement callback
        this.initializationManager?.markStateSet("inputAndMessagesAtMaxWidth");
      },
    );

    // Observe main content body width
    this.resizeObserverManager.observeMainContentBodyWidth(
      this.showHistory,
      ({ shouldRenderHistory }) => {
        if (this.shouldRenderHistory !== shouldRenderHistory) {
          const wasVisible = this.shouldRenderHistory;
          this.shouldRenderHistory = shouldRenderHistory;

          // Announce history visibility changes (but not on initial load)
          if (this.initializationManager?.isInitializationComplete()) {
            if (shouldRenderHistory && !wasVisible) {
              this.ariaAnnouncerManager?.announce(
                this.historyShownAnnouncement,
              );
            } else if (!shouldRenderHistory && wasVisible) {
              this.ariaAnnouncerManager?.announce(
                this.historyHiddenAnnouncement,
              );
            }
          }

          this.requestUpdate();
        }
      },
      () => {
        // Initial measurement callback
        this.initializationManager?.markStateSet("shouldRenderHistory");
      },
    );

    // Observe CSS properties
    this.resizeObserverManager.observeCssProperties(() => {
      this.requestUpdate();
    });

    // Initialize panel manager
    const panelsSlot = this.renderRoot.querySelector<HTMLSlotElement>(
      'slot[name="panels"]',
    );
    if (panelsSlot) {
      this.panelManager = new PanelManager(panelsSlot, widgetRoot);
      this.panelManager.connect();
    }

    // Initialize workspace manager
    this.workspaceManager = new WorkspaceManager(
      widgetRoot,
      this,
      {
        showWorkspace: this.showWorkspace,
        showHistory: this.showHistory,
        workspaceLocation: this.workspaceLocation,
        roundedCorners: this.cornerManager.hasAnyRoundedCorner(),
      },
      {
        onWorkspaceVisibilityChange: this.handleWorkspaceVisibilityChange,
      },
    );
    this.workspaceManager.connect();

    this.syncWorkspacePanelState();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);

    // Update corner manager when corner properties change
    if (
      changedProperties.has("cornerAll") ||
      changedProperties.has("cornerStartStart") ||
      changedProperties.has("cornerStartEnd") ||
      changedProperties.has("cornerEndStart") ||
      changedProperties.has("cornerEndEnd")
    ) {
      this.cornerManager?.updateCorners({
        cornerAll: this.cornerAll,
        cornerStartStart: this.cornerStartStart,
        cornerStartEnd: this.cornerStartEnd,
        cornerEndStart: this.cornerEndStart,
        cornerEndEnd: this.cornerEndEnd,
      });
    }

    // Update workspace manager when relevant properties change
    if (
      changedProperties.has("showWorkspace") ||
      changedProperties.has("showHistory") ||
      changedProperties.has("workspaceLocation") ||
      changedProperties.has("cornerAll") ||
      changedProperties.has("cornerStartStart") ||
      changedProperties.has("cornerStartEnd") ||
      changedProperties.has("cornerEndStart") ||
      changedProperties.has("cornerEndEnd")
    ) {
      this.workspaceManager?.updateConfig({
        showWorkspace: this.showWorkspace,
        showHistory: this.showHistory,
        workspaceLocation: this.workspaceLocation,
        roundedCorners: this.cornerManager?.hasAnyRoundedCorner() ?? false,
      });
    }

    this.syncWorkspacePanelState();
    this.panelManager?.refresh();
  }

  disconnectedCallback() {
    this.panelManager?.disconnect();
    this.workspaceManager?.disconnect();
    this.slotObserver?.disconnect();
    this.resizeObserverManager?.disconnect();
    this.ariaAnnouncerManager?.disconnect();
    this.cancelWorkspacePanelOpenSchedule();

    // Clean up event listeners
    this.removeEventListener("openend", this.handlePanelOpen);
    this.removeEventListener("closeend", this.handlePanelClose);

    super.disconnectedCallback();
  }

  private syncWorkspacePanelState(): void {
    const shouldRenderPanel =
      this.workspaceManager?.shouldRenderPanel() ?? false;
    const workspaceState = this.workspaceManager?.getState();

    if (shouldRenderPanel && !this.lastShouldRenderWorkspacePanel) {
      // Suppress animation when switching from inline container to panel
      // (workspace was visible inline and now moving to panel)
      const shouldSuppressAnimation =
        !this.lastWorkspaceInPanel && this.lastWorkspaceContainerVisible;

      // IMPORTANT: Set the flag BEFORE updating state that triggers render
      this.suppressWorkspacePanelOpenAnimation = shouldSuppressAnimation;

      // Now update the state
      this.workspacePanelRendering = true;
      this.workspacePanelOpen = false;
      this.cancelWorkspacePanelOpenSchedule();

      // Request update to render the panel with the correct animation attribute
      this.requestUpdate();

      // Schedule opening after the panel is rendered
      this.scheduleWorkspacePanelOpen();

      // Announce workspace opened (only when actually opening, not switching views)
      if (!shouldSuppressAnimation) {
        this.announceWorkspaceOpened();
      }
    } else if (!shouldRenderPanel && this.lastShouldRenderWorkspacePanel) {
      // Suppress animation when switching from panel to inline container
      // (workspace was in panel and now moving to inline)
      const shouldSuppressAnimation =
        this.lastWorkspaceInPanel &&
        (workspaceState?.containerVisible ?? false);

      this.suppressWorkspacePanelCloseAnimation = shouldSuppressAnimation;
      this.cancelWorkspacePanelOpenSchedule();
      if (this.workspacePanelOpen) {
        this.workspacePanelOpen = false;
        this.requestUpdate();

        // Announce workspace closed (only when actually closing, not switching views)
        if (!shouldSuppressAnimation) {
          this.announceWorkspaceClosed();
        }
      } else {
        this.workspacePanelRendering = false;
        this.requestUpdate();
      }
      this.suppressWorkspacePanelOpenAnimation = false;
    }

    this.lastShouldRenderWorkspacePanel = shouldRenderPanel;
    this.lastWorkspaceInPanel = workspaceState?.inPanel ?? false;
    this.lastWorkspaceContainerVisible =
      workspaceState?.containerVisible ?? false;
  }

  private scheduleWorkspacePanelOpen(): void {
    if (this.workspacePanelOpenScheduled) {
      return;
    }
    this.workspacePanelOpenScheduled = true;

    if (typeof window === "undefined") {
      this.workspacePanelOpenScheduled = false;
      this.workspacePanelOpen = true;
      return;
    }

    // Use double RAF to ensure the panel element is fully rendered with correct attributes
    this.workspacePanelOpenRafId = window.requestAnimationFrame(() => {
      this.workspacePanelOpenRafId = window.requestAnimationFrame(() => {
        this.workspacePanelOpenRafId = null;
        this.workspacePanelOpenScheduled = false;
        if (!this.workspaceManager?.shouldRenderPanel()) {
          return;
        }
        this.workspacePanelOpen = true;
        this.requestUpdate();
      });
    });
  }

  private cancelWorkspacePanelOpenSchedule(): void {
    if (
      this.workspacePanelOpenRafId !== null &&
      typeof window !== "undefined"
    ) {
      window.cancelAnimationFrame(this.workspacePanelOpenRafId);
    }
    this.workspacePanelOpenRafId = null;
    this.workspacePanelOpenScheduled = false;
  }

  private handleWorkspacePanelCloseEnd = () => {
    if (this.workspaceManager?.shouldRenderPanel()) {
      return;
    }
    this.workspacePanelRendering = false;
    this.suppressWorkspacePanelCloseAnimation = false;
    this.requestUpdate();
  };
}

export default CDSAIChatShell;
