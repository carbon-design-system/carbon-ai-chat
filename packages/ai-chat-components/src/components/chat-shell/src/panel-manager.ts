/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

interface PanelState {
  element: HTMLElement;
  open: boolean;
  priority: number;
  showChatHeader: boolean;
  index: number;
}

export class PanelManager {
  private panelObservers = new Map<HTMLElement, MutationObserver>();
  private slotElements: HTMLElement[] = [];

  constructor(
    private readonly panelsSlot: HTMLSlotElement,
    private readonly shellRoot: HTMLElement,
  ) {}

  connect() {
    this.syncSlotElements();
    this.panelsSlot.addEventListener("slotchange", this.onSlotChange);
    this.observeAssignedPanels();
    this.updateState();
  }

  disconnect() {
    this.panelsSlot.removeEventListener("slotchange", this.onSlotChange);
    this.stopObservingPanels();
  }

  refresh() {
    this.observeAssignedPanels();
    this.updateState();
  }

  private onSlotChange = () => {
    this.observeAssignedPanels();
    this.updateState();
  };

  private observeAssignedPanels() {
    const panels = this.getAssignedPanelElements();
    const current = new Set(panels);

    for (const [panel, observer] of this.panelObservers) {
      if (!current.has(panel)) {
        observer.disconnect();
        this.panelObservers.delete(panel);
      }
    }

    for (const panel of panels) {
      if (!this.panelObservers.has(panel)) {
        const observer = new MutationObserver(this.onPanelMutation);
        observer.observe(panel, { attributes: true });
        this.panelObservers.set(panel, observer);
      }
    }
  }

  private stopObservingPanels() {
    for (const observer of this.panelObservers.values()) {
      observer.disconnect();
    }
    this.panelObservers.clear();
  }

  private onPanelMutation = () => {
    this.updateState();
  };

  private updateState() {
    this.syncSlotElements();
    const panels = this.getPanelStates();
    const active = this.pickActivePanel(panels);

    const hasActive = Boolean(active);
    const headerInert = hasActive && !active?.showChatHeader;

    this.slotElements.forEach((slot) => {
      const slotName = slot.dataset.panelSlot;
      if (slotName === "header" || slotName === "header-after") {
        this.setInert(slot, headerInert);
      } else {
        this.setInert(slot, hasActive);
      }
    });

    panels.forEach((panel) => {
      const shouldInert =
        hasActive && panel.element !== active?.element && panel.open;
      this.setInert(panel.element, shouldInert);
    });

    const isAnyPanelAnimating = panels.some((panelState) =>
      this.isPanelAnimating(panelState.element),
    );
    this.shellRoot.classList.toggle(
      "shell--panels-animating",
      isAnyPanelAnimating,
    );
  }

  private getAssignedPanelElements(): HTMLElement[] {
    const internalPanels = Array.from(
      this.shellRoot.querySelectorAll<HTMLElement>(
        "cds-aichat-panel[data-internal-panel]",
      ),
    );

    const panelsElement = this.panelsSlot
      .assignedElements({ flatten: true })
      .find(
        (element): element is HTMLElement => element instanceof HTMLElement,
      );
    const slottedPanels = panelsElement
      ? Array.from(
          panelsElement.querySelectorAll<HTMLElement>("cds-aichat-panel"),
        )
      : [];

    const panels = [...internalPanels, ...slottedPanels];
    return Array.from(new Set(panels));
  }

  private getPanelStates(): PanelState[] {
    const panels = this.getAssignedPanelElements();
    return panels.map((element, index) => ({
      element,
      open: element.hasAttribute("open"),
      priority: Number(element.getAttribute("priority") ?? 0),
      showChatHeader: element.hasAttribute("show-chat-header"),
      index,
    }));
  }

  private pickActivePanel(panels: PanelState[]): PanelState | undefined {
    if (panels?.length) {
      const sortedPanels = panels
        .filter((panel) => panel.open)
        .sort((a, b) => {
          if (a.priority !== b.priority) {
            return b.priority - a.priority;
          }
          return b.index - a.index;
        });

      return sortedPanels[0];
    }
    return;
  }

  private setInert(target: HTMLElement | undefined, value: boolean) {
    if (!target) {
      return;
    }
    if (value) {
      target.inert = true;
    } else {
      target.inert = false;
    }
  }

  private isPanelAnimating(panelElement: HTMLElement) {
    return panelElement.classList.contains("panel-container--animating");
  }

  private syncSlotElements() {
    this.slotElements = Array.from(
      this.shellRoot.querySelectorAll<HTMLElement>("[data-panel-slot]"),
    );
  }
}
