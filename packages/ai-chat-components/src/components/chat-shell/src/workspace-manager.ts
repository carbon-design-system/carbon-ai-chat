/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import throttle from "lodash-es/throttle";

const WORKSPACE_MIN_WIDTH_FALLBACK = 640;
const MESSAGES_MIN_WIDTH_FALLBACK = 320;
const HISTORY_WIDTH_FALLBACK = 320;

interface WorkspaceConfig {
  showWorkspace: boolean;
  showHistory: boolean;
  workspaceLocation: "start" | "end";
  roundedCorners: boolean;
}

interface WorkspaceState {
  inPanel: boolean;
  contentVisible: boolean;
  containerVisible: boolean;
  isExpanding: boolean;
  isContracting: boolean;
}

/**
 * Manages workspace layout, responsive behavior, and transitions for cds-aichat-shell.
 * Handles switching between inline and panel modes based on available width,
 * and orchestrates smooth transitions when workspace visibility changes.
 */
export class WorkspaceManager {
  private state: WorkspaceState = {
    inPanel: false,
    contentVisible: true,
    containerVisible: false,
    isExpanding: false,
    isContracting: false,
  };

  private hostResizeObserver?: ResizeObserver;
  private windowResizeHandler?: () => void;
  private expansionCheckInterval?: number;
  private expansionLastInlineSize?: number;
  private closingCheckInterval?: number;
  private closingLastInlineSize?: number;
  private throttledHandleHostResize: (inlineSize: number) => void;
  private cssPropertyObserver?: MutationObserver;
  private lastKnownCssValues: {
    workspaceMinWidth?: number;
    messagesMinWidth?: number;
    historyWidth?: number;
  } = {};

  constructor(
    private readonly shellRoot: HTMLElement,
    private readonly hostElement: HTMLElement,
    private config: WorkspaceConfig,
  ) {
    this.throttledHandleHostResize = throttle(
      (inlineSize: number) => this.handleHostResize(inlineSize),
      100,
    );
  }

  // ========== Public API ==========

  /**
   * Initialize workspace management and start observing resize events.
   * Should be called after the shell component is fully rendered.
   */
  connect(): void {
    if (this.config.showWorkspace) {
      this.observeHostWidth();
      this.handleShowWorkspaceEnabled();
    }
    this.observeCssProperties();
  }

  /**
   * Clean up observers and timers.
   * Should be called when the shell component is disconnected.
   */
  disconnect(): void {
    this.hostResizeObserver?.disconnect();
    if (this.windowResizeHandler && typeof window !== "undefined") {
      window.removeEventListener("resize", this.windowResizeHandler);
    }
    this.clearExpansionTimers();
    this.clearClosingTimer();
    this.cssPropertyObserver?.disconnect();
  }

  /**
   * Refresh workspace state and re-evaluate layout.
   * Useful after external changes that might affect layout.
   */
  refresh(): void {
    if (this.config.showWorkspace) {
      this.observeHostWidth();
      this.performInitialHostMeasurement();
    }
  }

  /**
   * Update workspace configuration.
   * Handles transitions when workspace visibility or related settings change.
   */
  updateConfig(newConfig: Partial<WorkspaceConfig>): void {
    const oldConfig = { ...this.config };
    this.config = { ...this.config, ...newConfig };

    // Handle showWorkspace changes
    if (newConfig.showWorkspace !== undefined) {
      if (newConfig.showWorkspace && !oldConfig.showWorkspace) {
        this.observeHostWidth();
        this.handleShowWorkspaceEnabled();
      } else if (!newConfig.showWorkspace && oldConfig.showWorkspace) {
        this.handleShowWorkspaceDisabled();
      }
    }

    // Handle showHistory changes - affects layout when workspace is shown
    if (
      newConfig.showHistory !== undefined &&
      oldConfig.showHistory !== newConfig.showHistory &&
      this.config.showWorkspace &&
      this.state.containerVisible &&
      !this.state.isExpanding &&
      !this.state.isContracting
    ) {
      // Immediately recalculate with current width
      // The config is already updated, so calculations will use new showHistory value
      const currentWidth = this.hostElement.getBoundingClientRect().width;
      this.updateWorkspaceInPanelState(currentWidth);
    }
  }

  /**
   * Get current workspace state.
   * Returns a readonly copy to prevent external mutations.
   */
  getState(): Readonly<WorkspaceState> {
    return { ...this.state };
  }

  /**
   * Check if workspace should be rendered inline (side-by-side with messages).
   */
  shouldRenderInline(): boolean {
    return this.state.containerVisible && !this.state.inPanel;
  }

  /**
   * Check if workspace should be rendered as a panel (overlay).
   */
  shouldRenderPanel(): boolean {
    return this.state.containerVisible && this.state.inPanel;
  }

  // ========== Private Methods ==========

  private observeHostWidth(): void {
    this.setupWindowResizeListener();

    if (typeof ResizeObserver === "undefined") {
      this.performInitialHostMeasurement();
      return;
    }

    if (!this.hostResizeObserver) {
      this.createHostResizeObserver();
    } else {
      this.reconnectHostResizeObserver();
    }

    this.performInitialHostMeasurement();
  }

  private setupWindowResizeListener(): void {
    if (this.windowResizeHandler || typeof window === "undefined") {
      return;
    }

    this.windowResizeHandler = () => {
      this.throttledHandleHostResize(
        this.hostElement.getBoundingClientRect().width,
      );
    };
    window.addEventListener("resize", this.windowResizeHandler);
  }

  private createHostResizeObserver(): void {
    this.hostResizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const inlineSize = this.getInlineSizeFromEntry(entry);
        this.throttledHandleHostResize(inlineSize);
      }
    });
    this.hostResizeObserver.observe(this.hostElement);
  }

  private reconnectHostResizeObserver(): void {
    if (this.hostResizeObserver && this.config.showWorkspace) {
      this.hostResizeObserver.disconnect();
      this.hostResizeObserver.observe(this.hostElement);
    }
  }

  private performInitialHostMeasurement(): void {
    const currentWidth = this.hostElement.getBoundingClientRect().width;

    if (!this.config.showWorkspace || !this.state.containerVisible) {
      this.setWorkspaceInPanel(false);
      return;
    }

    this.handleHostResize(currentWidth);
  }

  private handleHostResize(inlineSize: number): void {
    if (this.state.isExpanding) {
      this.trackExpectedExpansion(inlineSize);
      return;
    }

    if (this.state.isContracting) {
      return;
    }

    this.updateWorkspaceInPanelState(inlineSize);
  }

  private updateWorkspaceInPanelState(inlineSize: number): void {
    if (!Number.isFinite(inlineSize)) {
      return;
    }

    if (
      !this.config.showWorkspace ||
      !this.state.containerVisible ||
      this.state.isContracting
    ) {
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

    const historyWidth = this.config.showHistory
      ? this.getCssLengthFromProperty(
          "--cds-aichat-history-width",
          HISTORY_WIDTH_FALLBACK,
        )
      : 0;

    const sideBySideMinWidth =
      workspaceMinWidth + messagesMinWidth + historyWidth;

    const shouldBeInPanel = inlineSize < sideBySideMinWidth;

    this.setWorkspaceInPanel(shouldBeInPanel);
  }

  private handleShowWorkspaceEnabled(): void {
    // Cancel any ongoing closing animation
    this.clearClosingTimer();
    this.setState({ isContracting: false });

    // Show the workspace container immediately
    this.setShowWorkspaceContainer(true);

    const inlineSize = this.hostElement.getBoundingClientRect().width;
    const requiredWidth = this.getRequiredMinWidth();

    // Scenario 1: Already wide enough - show immediately
    if (this.isWideEnough(inlineSize, requiredWidth)) {
      this.finalizeImmediateDisplay(inlineSize, false);
      return;
    }

    // Scenario 2: Host can't ever reach required size - go straight to panel
    if (!this.canHostGrow(requiredWidth)) {
      this.finalizeImmediateDisplay(inlineSize, true);
      return;
    }

    // Scenario 3: Expecting expansion - setup tracking
    this.setupExpansionTracking();
  }

  private handleShowWorkspaceDisabled(): void {
    // Step 1: Immediately mark that we're closing to prevent mode switches
    // This must happen FIRST before any other state changes
    this.setState({ isContracting: true });

    // Step 2: Lock in the current panel state to prevent it from changing
    // Store the current value so it doesn't change during closing
    const wasInPanel = this.state.inPanel;

    // Step 3: Immediately hide the workspace content (opacity goes to 0 instantly)
    this.setWorkspaceContentVisible(false);

    // Step 4: Restore the panel state in case setWorkspaceContentVisible triggered a change
    if (this.state.inPanel !== wasInPanel) {
      this.setWorkspaceInPanel(wasInPanel);
    }

    // Step 5: Clear any ongoing expansion tracking
    this.clearExpansionTimers();
    this.setState({ isExpanding: false });

    // Step 6: Disconnect host resize observer to prevent interference during closing
    this.hostResizeObserver?.disconnect();
    this.hostResizeObserver = undefined;

    // Step 7: Poll to check if host has finished contracting
    // Keep the workspace container visible (but empty) during this time
    // to maintain its width and prevent messages area from expanding
    this.clearClosingTimer();
    this.closingLastInlineSize = this.hostElement.getBoundingClientRect().width;
    this.startClosingPolling();
  }

  private startExpansionPolling(): void {
    const initialWidth = this.expansionLastInlineSize;

    // Check every 100ms if the host has stopped resizing
    this.expansionCheckInterval = window.setInterval(() => {
      const currentWidth = this.hostElement.getBoundingClientRect().width;

      // If width hasn't changed from last check, the transition is complete
      if (currentWidth === this.expansionLastInlineSize) {
        // If we never saw any movement from initial width, go to panel mode
        const sawMovement = currentWidth !== initialWidth;
        this.finishWorkspaceExpansion(sawMovement);
      } else {
        this.expansionLastInlineSize = currentWidth;
      }
    }, 100);
  }

  private startClosingPolling(): void {
    // Check every 100ms if the host has stopped resizing
    this.closingCheckInterval = window.setInterval(() => {
      const currentWidth = this.hostElement.getBoundingClientRect().width;

      // If width hasn't changed, the transition is complete
      if (currentWidth === this.closingLastInlineSize) {
        this.finishWorkspaceClosing();
      } else {
        this.closingLastInlineSize = currentWidth;
      }
    }, 100);
  }

  private finishWorkspaceExpansion(sawMovement: boolean): void {
    const inlineSize =
      this.expansionLastInlineSize ??
      this.hostElement.getBoundingClientRect().width;

    // Clear the expansion flag and timers first
    this.setState({ isExpanding: false });
    this.clearExpansionTimers();

    // Determine the correct panel state BEFORE showing content
    if (!sawMovement) {
      this.setWorkspaceInPanel(true);
    } else {
      this.updateWorkspaceInPanelState(inlineSize);
    }

    // Now show the workspace content after panel state is set
    this.setWorkspaceContentVisible(true);
  }

  private finishWorkspaceClosing(): void {
    // Now hide the workspace container (removes from DOM)
    this.setShowWorkspaceContainer(false);

    // Reset workspace state
    this.setWorkspaceInPanel(false);
    this.setState({ isContracting: false });

    // Clear the timers
    this.clearClosingTimer();

    // Reset tracking
    this.closingLastInlineSize = undefined;
  }

  private trackExpectedExpansion(inlineSize: number): void {
    if (!Number.isFinite(inlineSize)) {
      return;
    }

    // Update the last known size - the polling interval will detect when it stops changing
    this.expansionLastInlineSize = inlineSize;
  }

  private clearExpansionTimers(): void {
    if (this.expansionCheckInterval) {
      clearInterval(this.expansionCheckInterval);
      this.expansionCheckInterval = undefined;
    }
    this.expansionLastInlineSize = undefined;
  }

  private clearClosingTimer(): void {
    if (this.closingCheckInterval) {
      clearInterval(this.closingCheckInterval);
      this.closingCheckInterval = undefined;
    }
  }

  private setWorkspaceInPanel(inPanel: boolean): void {
    if (this.state.inPanel === inPanel) {
      return;
    }

    this.setState({ inPanel });
    this.hostElement.toggleAttribute("workspace-in-panel", inPanel);
    this.requestHostUpdate();
  }

  private setWorkspaceContentVisible(visible: boolean): void {
    if (this.state.contentVisible === visible) {
      return;
    }
    this.setState({ contentVisible: visible });
    this.requestHostUpdate();
  }

  private setShowWorkspaceContainer(show: boolean): void {
    if (this.state.containerVisible === show) {
      return;
    }
    this.setState({ containerVisible: show });
    this.requestHostUpdate();
  }

  private setState(updates: Partial<WorkspaceState>): void {
    this.state = { ...this.state, ...updates };
    this.updateShellClasses();
  }

  private updateShellClasses(): void {
    this.shellRoot.classList.toggle(
      "workspace-closing",
      this.state.isContracting,
    );
    this.shellRoot.classList.toggle(
      "workspace-opening",
      this.state.isExpanding,
    );
  }

  private requestHostUpdate(): void {
    // Trigger re-render on Lit element
    if ("requestUpdate" in this.hostElement) {
      (this.hostElement as any).requestUpdate();
    }
  }

  private getRequiredMinWidth(): number {
    const workspaceMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-workspace-min-width",
      WORKSPACE_MIN_WIDTH_FALLBACK,
    );
    const messagesMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-messages-min-width",
      MESSAGES_MIN_WIDTH_FALLBACK,
    );
    const historyWidth = this.config.showHistory
      ? this.getCssLengthFromProperty(
          "--cds-aichat-history-width",
          HISTORY_WIDTH_FALLBACK,
        )
      : 0;

    return workspaceMinWidth + messagesMinWidth + historyWidth;
  }

  private isWideEnough(inlineSize: number, requiredWidth: number): boolean {
    return typeof window === "undefined" || inlineSize >= requiredWidth;
  }

  private canHostGrow(requiredWidth: number): boolean {
    return typeof window !== "undefined" && window.innerWidth >= requiredWidth;
  }

  private finalizeImmediateDisplay(
    inlineSize: number,
    usePanel: boolean,
  ): void {
    this.setWorkspaceContentVisible(true);
    this.setState({ isExpanding: false });
    this.clearExpansionTimers();

    if (usePanel) {
      this.setWorkspaceInPanel(true);
    } else {
      this.updateWorkspaceInPanelState(inlineSize);
    }
  }

  private setupExpansionTracking(): void {
    this.setState({ isExpanding: true });
    this.clearExpansionTimers();
    this.setWorkspaceInPanel(false);
    this.setWorkspaceContentVisible(false);
    this.expansionLastInlineSize =
      this.hostElement.getBoundingClientRect().width;
    this.startExpansionPolling();
  }

  private getInlineSizeFromEntry(entry: ResizeObserverEntry): number {
    const borderBoxSize = Array.isArray(entry.borderBoxSize)
      ? entry.borderBoxSize[0]
      : entry.borderBoxSize;
    return borderBoxSize?.inlineSize ?? entry.contentRect.width;
  }

  private getCssLengthFromProperty(
    propertyName: string,
    fallback: number,
  ): number {
    const value = getComputedStyle(this.hostElement)
      .getPropertyValue(propertyName)
      .trim();
    if (!value) {
      return fallback;
    }
    const parsed = Number.parseFloat(value);
    return Number.isNaN(parsed) ? fallback : parsed;
  }

  /**
   * Observe CSS custom properties that affect workspace layout.
   * When these properties change, recalculate workspace positioning.
   */
  private observeCssProperties(): void {
    if (typeof MutationObserver === "undefined") {
      return;
    }

    // Store initial values
    this.updateLastKnownCssValues();

    // Watch for style attribute changes on the host element
    this.cssPropertyObserver = new MutationObserver(() => {
      this.checkCssPropertyChanges();
    });

    this.cssPropertyObserver.observe(this.hostElement, {
      attributes: true,
      attributeFilter: ["style"],
    });
  }

  /**
   * Update the cached CSS property values.
   */
  private updateLastKnownCssValues(): void {
    this.lastKnownCssValues = {
      workspaceMinWidth: this.getCssLengthFromProperty(
        "--cds-aichat-workspace-min-width",
        WORKSPACE_MIN_WIDTH_FALLBACK,
      ),
      messagesMinWidth: this.getCssLengthFromProperty(
        "--cds-aichat-messages-min-width",
        MESSAGES_MIN_WIDTH_FALLBACK,
      ),
      historyWidth: this.getCssLengthFromProperty(
        "--cds-aichat-history-width",
        HISTORY_WIDTH_FALLBACK,
      ),
    };
  }

  /**
   * Check if any relevant CSS properties have changed and trigger recalculation.
   */
  private checkCssPropertyChanges(): void {
    const workspaceMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-workspace-min-width",
      WORKSPACE_MIN_WIDTH_FALLBACK,
    );
    const messagesMinWidth = this.getCssLengthFromProperty(
      "--cds-aichat-messages-min-width",
      MESSAGES_MIN_WIDTH_FALLBACK,
    );
    const historyWidth = this.getCssLengthFromProperty(
      "--cds-aichat-history-width",
      HISTORY_WIDTH_FALLBACK,
    );

    const hasChanged =
      workspaceMinWidth !== this.lastKnownCssValues.workspaceMinWidth ||
      messagesMinWidth !== this.lastKnownCssValues.messagesMinWidth ||
      historyWidth !== this.lastKnownCssValues.historyWidth;

    if (hasChanged) {
      this.updateLastKnownCssValues();

      // Only recalculate if workspace is visible and not in transition
      if (
        this.config.showWorkspace &&
        this.state.containerVisible &&
        !this.state.isExpanding &&
        !this.state.isContracting
      ) {
        const currentWidth = this.hostElement.getBoundingClientRect().width;
        this.updateWorkspaceInPanelState(currentWidth);
      }
    }
  }
}

// Made with Bob
