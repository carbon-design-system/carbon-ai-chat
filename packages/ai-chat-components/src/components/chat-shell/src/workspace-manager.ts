/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import throttle from "lodash-es/throttle.js";
import {
  calculateRequiredWidth,
  hasSignificantWidthChange,
  isWideEnough,
  canHostGrow,
  getInlineSizeFromEntry,
  getCssLengthFromProperty,
  areWorkspaceAttributesCorrect,
  shouldSkipWorkspaceUpdate,
} from "./workspace-manager-utils.js";

const WORKSPACE_MIN_WIDTH_FALLBACK = 640;
const MESSAGES_MIN_WIDTH_FALLBACK = 320;
const HISTORY_WIDTH_FALLBACK = 320;
const EXPANSION_POLL_INTERVAL_MS = 200;
const EXPANSION_THRESHOLD_PX = 1;

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
  isCheckingExpansion: boolean;
  isExpanding: boolean;
  isCheckingContracting: boolean;
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
    isCheckingExpansion: false,
    isExpanding: false,
    isCheckingContracting: false,
    isContracting: false,
  };

  private hostResizeObserver?: ResizeObserver;
  private windowResizeHandler?: () => void;
  private expansionCheckInterval?: number;
  private expansionLastInlineSize?: number;
  private contractionCheckInterval?: number;
  private contractionLastInlineSize?: number;
  private contractionInitialInlineSize?: number;
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
    this.clearContractionTimers();
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
        // handleShowWorkspaceEnabled will call observeHostWidth at the right time
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
    // During checking phase, optimistically render inline
    if (this.state.isCheckingExpansion) {
      return (
        this.state.containerVisible &&
        !this.state.isContracting &&
        !this.state.isCheckingContracting
      );
    }

    // During expanding phase, always render inline (will be hidden with CSS)
    if (this.state.isExpanding) {
      return (
        this.state.containerVisible &&
        !this.state.isContracting &&
        !this.state.isCheckingContracting
      );
    }

    // During checking-contracting phase, keep rendering inline to maintain layout
    if (this.state.isCheckingContracting) {
      return this.state.containerVisible;
    }

    // During contracting phase, keep rendering inline to maintain layout
    // Container will be removed from DOM at the very end
    if (this.state.isContracting) {
      return this.state.containerVisible;
    }

    // In stable state, render inline if not in panel mode
    const returnValue = this.state.containerVisible && !this.state.inPanel;
    return returnValue;
  }

  /**
   * Check if workspace should be rendered as a panel (overlay).
   */
  shouldRenderPanel(): boolean {
    return (
      this.state.containerVisible &&
      this.state.inPanel &&
      !this.state.isCheckingExpansion &&
      !this.state.isExpanding &&
      !this.state.isCheckingContracting &&
      !this.state.isContracting
    );
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
        const inlineSize = getInlineSizeFromEntry(entry);
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

    // Don't perform initial measurement during expansion/contraction
    if (this.state.isExpanding || this.state.isContracting) {
      return;
    }

    this.handleHostResize(currentWidth);
  }

  private handleHostResize(inlineSize: number): void {
    if (this.state.isExpanding) {
      this.trackExpectedExpansion(inlineSize);
      return;
    }

    if (this.state.isCheckingContracting) {
      this.trackExpectedContraction(inlineSize);
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

    if (shouldSkipWorkspaceUpdate(this.config, this.state)) {
      this.setWorkspaceInPanel(false);
      return;
    }

    // Skip during expansion
    if (this.state.isExpanding) {
      return;
    }

    const dimensions = this.getLayoutDimensions();
    const sideBySideMinWidth = calculateRequiredWidth(dimensions);
    const shouldBeInPanel = inlineSize < sideBySideMinWidth;

    this.setWorkspaceInPanel(shouldBeInPanel);
  }

  /**
   * Get layout dimensions from cache or compute if not available.
   * Uses cached CSS values for performance, falling back to live computation.
   */
  private getLayoutDimensions(): {
    workspaceMinWidth: number;
    messagesMinWidth: number;
    historyWidth: number;
  } {
    // Ensure cache is populated
    if (!this.lastKnownCssValues.workspaceMinWidth) {
      this.updateLastKnownCssValues();
    }

    return {
      workspaceMinWidth:
        this.lastKnownCssValues.workspaceMinWidth ??
        WORKSPACE_MIN_WIDTH_FALLBACK,
      messagesMinWidth:
        this.lastKnownCssValues.messagesMinWidth ?? MESSAGES_MIN_WIDTH_FALLBACK,
      historyWidth: this.config.showHistory
        ? (this.lastKnownCssValues.historyWidth ?? HISTORY_WIDTH_FALLBACK)
        : 0,
    };
  }

  private handleShowWorkspaceEnabled(): void {
    // Cancel any ongoing closing animation
    this.clearContractionTimers();
    this.setState({ isCheckingContracting: false, isContracting: false });

    const inlineSize = this.hostElement.getBoundingClientRect().width;
    const requiredWidth = this.getRequiredMinWidth();

    // Scenario 1: Already wide enough - show immediately
    if (isWideEnough(inlineSize, requiredWidth)) {
      this.initializeImmediateDisplay("container", inlineSize);
      return;
    }

    // Scenario 2: Host can't ever reach required size - go straight to panel
    if (!canHostGrow(requiredWidth)) {
      this.initializeImmediateDisplay("panel", inlineSize);
      return;
    }

    // Scenario 3: Expecting expansion - setup tracking
    this.initializeExpansionTracking();
  }

  private initializeImmediateDisplay(
    mode: "container" | "panel",
    inlineSize: number,
  ): void {
    const attribute =
      mode === "container" ? "workspace-in-container" : "workspace-in-panel";

    // Pre-set workspace attribute to prevent layout flash
    this.hostElement.setAttribute(attribute, "");
    // Show the workspace container immediately
    this.setShowWorkspaceContainer(true);
    this.observeHostWidth();
    this.finalizeImmediateDisplay(inlineSize, mode === "panel");
  }

  private initializeExpansionTracking(): void {
    // Set isCheckingExpansion BEFORE showing container AND observing
    // This allows workspace to render inline but remain invisible while we check for expansion
    this.setState({ isCheckingExpansion: true });

    // Don't pre-set workspace mode - let expansion tracking determine it
    // The workspace-checking class on shell will handle the transition state

    this.setShowWorkspaceContainer(true);
    this.observeHostWidth();
    this.setupExpansionTracking();
  }

  private handleShowWorkspaceDisabled(): void {
    // Step 1: Clear any ongoing expansion tracking first
    this.clearExpansionTimers();
    this.setState({ isCheckingExpansion: false, isExpanding: false });

    // Step 2: Immediately hide the workspace content (opacity goes to 0 instantly)
    this.setWorkspaceContentVisible(false);

    // Step 3: Check if we need to track contraction
    const currentWidth = this.hostElement.getBoundingClientRect().width;
    const requiredWidth = this.getRequiredMinWidth();

    // If host is currently wide enough for inline workspace, expect contraction
    if (
      isWideEnough(currentWidth, requiredWidth) &&
      canHostGrow(requiredWidth)
    ) {
      this.setupContractionTracking();
    } else {
      // No contraction expected, go straight to closing
      this.initializeImmediateClosing();
    }
  }

  private startExpansionPolling(): void {
    const initialWidth = this.expansionLastInlineSize ?? 0;
    const hasSetContainerMode = { value: false };

    this.expansionCheckInterval = window.setInterval(() => {
      this.checkExpansionProgress(initialWidth, hasSetContainerMode);
    }, EXPANSION_POLL_INTERVAL_MS);
  }

  /**
   * Check expansion progress and determine if transition is complete.
   */
  private checkExpansionProgress(
    initialWidth: number,
    hasSetContainerMode: { value: boolean },
  ): void {
    const currentWidth = this.hostElement.getBoundingClientRect().width;

    if (currentWidth === this.expansionLastInlineSize) {
      // Width stabilized - expansion complete
      const sawMovement = hasSignificantWidthChange(
        currentWidth,
        initialWidth,
        EXPANSION_THRESHOLD_PX,
      );
      this.finishWorkspaceExpansion(sawMovement);
    } else {
      // Width still changing - track ongoing expansion
      this.handleOngoingExpansion(
        currentWidth,
        initialWidth,
        hasSetContainerMode,
      );
    }
  }

  /**
   * Handle ongoing width changes during expansion.
   */
  private handleOngoingExpansion(
    currentWidth: number,
    initialWidth: number,
    hasSetContainerMode: { value: boolean },
  ): void {
    // Set workspace-in-container mode on first detected meaningful movement
    if (
      !hasSetContainerMode.value &&
      hasSignificantWidthChange(
        currentWidth,
        initialWidth,
        EXPANSION_THRESHOLD_PX,
      )
    ) {
      // Transition from checking to confirmed expanding
      this.setState({ isCheckingExpansion: false, isExpanding: true });
      this.setWorkspaceInContainerMode();
      hasSetContainerMode.value = true;
    }

    this.expansionLastInlineSize = currentWidth;
  }

  /**
   * Set workspace to container mode by updating DOM attributes.
   */
  private setWorkspaceInContainerMode(): void {
    this.hostElement.removeAttribute("workspace-in-panel");
    this.hostElement.setAttribute("workspace-in-container", "");
  }

  private setupContractionTracking(): void {
    // Set isCheckingContracting BEFORE clearing attributes
    // This allows workspace to stay inline while we check for contraction
    this.setState({ isCheckingContracting: true });

    // Store initial width for comparison
    this.contractionInitialInlineSize =
      this.hostElement.getBoundingClientRect().width;
    this.contractionLastInlineSize = this.contractionInitialInlineSize;

    // Keep observing host width to detect contraction
    // Don't disconnect the observer - we need it to track contraction
    this.startContractionPolling();
  }

  private initializeImmediateClosing(): void {
    // Mark as contracting and proceed directly to closing
    this.setState({ isContracting: true });

    // Disconnect host resize observer
    this.hostResizeObserver?.disconnect();
    this.hostResizeObserver = undefined;

    // Immediately finish closing (will clear attributes)
    this.finishWorkspaceClosing();
  }

  private startContractionPolling(): void {
    const initialWidth = this.contractionInitialInlineSize ?? 0;
    const hasSetContractingMode = { value: false };

    this.contractionCheckInterval = window.setInterval(() => {
      this.checkContractionProgress(initialWidth, hasSetContractingMode);
    }, EXPANSION_POLL_INTERVAL_MS);
  }

  private checkContractionProgress(
    initialWidth: number,
    hasSetContractingMode: { value: boolean },
  ): void {
    const currentWidth = this.hostElement.getBoundingClientRect().width;

    if (currentWidth === this.contractionLastInlineSize) {
      // Width stabilized - contraction complete
      const sawMovement = hasSignificantWidthChange(
        currentWidth,
        initialWidth,
        EXPANSION_THRESHOLD_PX,
      );
      this.finishWorkspaceContraction(sawMovement);
    } else {
      // Width still changing - track ongoing contraction
      this.handleOngoingContraction(
        currentWidth,
        initialWidth,
        hasSetContractingMode,
      );
    }
  }

  private handleOngoingContraction(
    currentWidth: number,
    initialWidth: number,
    hasSetContractingMode: { value: boolean },
  ): void {
    // Set contracting mode on first detected meaningful shrinkage
    if (
      !hasSetContractingMode.value &&
      hasSignificantWidthChange(
        currentWidth,
        initialWidth,
        EXPANSION_THRESHOLD_PX,
      ) &&
      currentWidth < initialWidth
    ) {
      // Transition from checking to confirmed contracting
      // DON'T clear workspace attributes yet - keep them to maintain layout
      this.setState({ isCheckingContracting: false, isContracting: true });
      hasSetContractingMode.value = true;
    }

    this.contractionLastInlineSize = currentWidth;
  }

  private finishWorkspaceContraction(sawMovement: boolean): void {
    // Clear checking-contracting flag and timers
    this.setState({ isCheckingContracting: false });
    this.clearContractionTimers();

    if (!sawMovement) {
      // No contraction happened, safe to close immediately
      this.setState({ isContracting: true });
      this.hostResizeObserver?.disconnect();
      this.hostResizeObserver = undefined;
      // Clear attributes and finish closing
      this.finishWorkspaceClosing();
    } else {
      // Contraction happened, need to wait for host to finish contracting
      // before removing workspace from DOM
      this.setState({ isContracting: true });

      // DON'T clear workspace attributes yet - keep them to maintain layout
      // They will be cleared in finishWorkspaceClosing()

      // Disconnect host resize observer to prevent interference
      this.hostResizeObserver?.disconnect();
      this.hostResizeObserver = undefined;

      // Start polling to detect when host has finished contracting
      this.contractionLastInlineSize =
        this.hostElement.getBoundingClientRect().width;
      this.startFinalContractionPolling();
    }
  }

  private startFinalContractionPolling(): void {
    this.contractionCheckInterval = window.setInterval(() => {
      const currentWidth = this.hostElement.getBoundingClientRect().width;

      // If width hasn't changed, the host has finished contracting
      if (currentWidth === this.contractionLastInlineSize) {
        this.finishWorkspaceClosing();
      } else {
        this.contractionLastInlineSize = currentWidth;
      }
    }, EXPANSION_POLL_INTERVAL_MS);
  }

  private trackExpectedContraction(inlineSize: number): void {
    if (!Number.isFinite(inlineSize)) {
      return;
    }

    // Update the last known size - the polling interval will detect when it stops changing
    this.contractionLastInlineSize = inlineSize;
  }

  private finishWorkspaceExpansion(sawMovement: boolean): void {
    const inlineSize =
      this.expansionLastInlineSize ??
      this.hostElement.getBoundingClientRect().width;

    // Clear both checking and expanding flags and timers
    this.setState({ isCheckingExpansion: false, isExpanding: false });
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
    // IMPORTANT: Remove workspace container from DOM FIRST while attributes are still present
    // This prevents input-and-messages from expanding while workspace is still in DOM
    this.setShowWorkspaceContainer(false);

    // Now clear attributes AFTER container is removed from DOM
    this.hostElement.removeAttribute("workspace-in-panel");
    this.hostElement.removeAttribute("workspace-in-container");

    // Reset workspace state to original values
    this.setState({
      inPanel: false,
      contentVisible: true,
      containerVisible: false,
      isCheckingExpansion: false,
      isExpanding: false,
      isCheckingContracting: false,
      isContracting: false,
    });

    // Clear the timers
    this.clearContractionTimers();

    // Reset tracking
    this.contractionLastInlineSize = undefined;
    this.contractionInitialInlineSize = undefined;
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

  private clearContractionTimers(): void {
    if (this.contractionCheckInterval) {
      clearInterval(this.contractionCheckInterval);
      this.contractionCheckInterval = undefined;
    }
    this.contractionLastInlineSize = undefined;
    this.contractionInitialInlineSize = undefined;
  }

  /**
   * Updates workspace DOM attributes to match the panel state.
   * Maintains inverse relationship between panel and container attributes.
   *
   * @param inPanel - True for panel mode, false for container mode
   */
  private updateWorkspaceAttributes(inPanel: boolean): void {
    this.hostElement.toggleAttribute("workspace-in-panel", inPanel);
    // workspace-in-container is the inverse of workspace-in-panel
    this.hostElement.toggleAttribute("workspace-in-container", !inPanel);
  }

  /**
   * Updates the workspace panel state and corresponding DOM attributes.
   *
   * Synchronizes internal state with DOM attributes that control whether
   * the workspace is displayed as an overlay panel or inline container.
   *
   * Ignores calls during expansion/contraction transitions. Only updates if
   * state or attributes need changes. Maintains inverse relationship between
   * panel and container attributes.
   *
   * @param inPanel - True to display workspace as overlay panel, false for inline
   */
  private setWorkspaceInPanel(inPanel: boolean): void {
    // Early exit during transitions
    if (
      this.state.isExpanding ||
      this.state.isCheckingContracting ||
      this.state.isContracting
    ) {
      return;
    }

    const stateChanged = this.state.inPanel !== inPanel;
    const attributesCorrect = areWorkspaceAttributesCorrect(
      this.hostElement,
      inPanel,
    );

    // Nothing to do if state and attributes are already correct
    if (!stateChanged && attributesCorrect) {
      return;
    }

    // Update state if needed
    if (stateChanged) {
      this.setState({ inPanel });
    }

    // Update attributes
    this.updateWorkspaceAttributes(inPanel);

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
      "workspace-checking",
      this.state.isCheckingExpansion,
    );
    this.shellRoot.classList.toggle(
      "workspace-checking-closing",
      this.state.isCheckingContracting,
    );
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
    const workspaceMinWidth = getCssLengthFromProperty(
      this.hostElement,
      "--cds-aichat-workspace-min-width",
      WORKSPACE_MIN_WIDTH_FALLBACK,
    );
    const messagesMinWidth = getCssLengthFromProperty(
      this.hostElement,
      "--cds-aichat-messages-min-width",
      MESSAGES_MIN_WIDTH_FALLBACK,
    );
    const historyWidth = this.config.showHistory
      ? getCssLengthFromProperty(
          this.hostElement,
          "--cds-aichat-history-width",
          HISTORY_WIDTH_FALLBACK,
        )
      : 0;

    return workspaceMinWidth + messagesMinWidth + historyWidth;
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
    // isExpanding is already set in handleShowWorkspaceEnabled
    this.clearExpansionTimers();

    // Don't set workspace-in-container early - wait to see if expansion actually happens
    // This prevents the flash of container mode CSS when opening directly to panel mode
    this.setWorkspaceContentVisible(false);
    this.expansionLastInlineSize =
      this.hostElement.getBoundingClientRect().width;
    this.startExpansionPolling();
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
      workspaceMinWidth: getCssLengthFromProperty(
        this.hostElement,
        "--cds-aichat-workspace-min-width",
        WORKSPACE_MIN_WIDTH_FALLBACK,
      ),
      messagesMinWidth: getCssLengthFromProperty(
        this.hostElement,
        "--cds-aichat-messages-min-width",
        MESSAGES_MIN_WIDTH_FALLBACK,
      ),
      historyWidth: getCssLengthFromProperty(
        this.hostElement,
        "--cds-aichat-history-width",
        HISTORY_WIDTH_FALLBACK,
      ),
    };
  }

  /**
   * Check if any relevant CSS properties have changed and trigger recalculation.
   */
  private checkCssPropertyChanges(): void {
    const workspaceMinWidth = getCssLengthFromProperty(
      this.hostElement,
      "--cds-aichat-workspace-min-width",
      WORKSPACE_MIN_WIDTH_FALLBACK,
    );
    const messagesMinWidth = getCssLengthFromProperty(
      this.hostElement,
      "--cds-aichat-messages-min-width",
      MESSAGES_MIN_WIDTH_FALLBACK,
    );
    const historyWidth = getCssLengthFromProperty(
      this.hostElement,
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
        !this.state.isCheckingContracting &&
        !this.state.isContracting
      ) {
        const currentWidth = this.hostElement.getBoundingClientRect().width;
        this.updateWorkspaceInPanelState(currentWidth);
      }
    }
  }
}

// Made with Bob
