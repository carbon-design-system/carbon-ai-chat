/**
 * @license
 *
 * Copyright IBM Corp. 2025, 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  getDeepActiveElement,
  isElementInvisible,
  tryFocus,
  walkComposedTree,
} from '../../../globals/utils/focus-utils.js';
import prefix from '../../../globals/settings.js';

function composedContains(
  container: HTMLElement,
  element: Element | null
): boolean {
  for (let node = element; node;) {
    if (node === container) {
      return true;
    }
    node = node.parentElement ?? (node.getRootNode() as ShadowRoot).host;
  }
  return false;
}

function hasLostPanelFocus(focused: Element | null, focusPath: EventTarget[]) {
  return (
    focused === document.body ||
    (focused instanceof HTMLElement &&
      focused.shadowRoot &&
      focusPath.includes(focused))
  );
}

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
  private activePanel?: HTMLElement;
  private returnTargets = new Map<HTMLElement, Element | null>();
  private focusedPanel?: HTMLElement;
  private focusPath: EventTarget[] = [];
  private restoreFrame?: number;
  private contentObserver = new MutationObserver(() => {
    this.observeAssignedPanels();
    this.updateState();
  });

  constructor(
    private readonly panelsSlot: HTMLSlotElement,
    private readonly shellRoot: HTMLElement
  ) {}

  connect() {
    document.addEventListener('focusin', this.onFocusIn);
    this.shellRoot.addEventListener('openstart', this.onOpenStart, true);
    this.shellRoot.addEventListener('closestart', this.onPanelMutation, true);
    this.syncSlotElements();
    this.panelsSlot.addEventListener('slotchange', this.onSlotChange);
    this.observeAssignedPanels();
    this.updateState();
  }

  disconnect() {
    document.removeEventListener('focusin', this.onFocusIn);
    this.shellRoot.removeEventListener('openstart', this.onOpenStart, true);
    this.shellRoot.removeEventListener(
      'closestart',
      this.onPanelMutation,
      true
    );
    this.contentObserver.disconnect();
    if (this.restoreFrame !== undefined) {
      cancelAnimationFrame(this.restoreFrame);
    }
    this.returnTargets.clear();
    this.panelsSlot.removeEventListener('slotchange', this.onSlotChange);
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
    this.contentObserver.disconnect();
    for (const element of this.panelsSlot.assignedElements()) {
      this.contentObserver.observe(element, { childList: true, subtree: true });
    }
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
    const previous = this.activePanel;
    const focused = getDeepActiveElement();
    const shouldRestore =
      previous &&
      previous !== active?.element &&
      (!previous.isConnected || !previous.hasAttribute('open')) &&
      (composedContains(previous, focused) ||
        (hasLostPanelFocus(focused, this.focusPath) &&
          this.focusedPanel === previous));
    this.activePanel = active?.element;
    if (active && !this.returnTargets.has(active.element)) {
      this.returnTargets.set(active.element, focused);
    }

    const hasActive = Boolean(active);
    const headerInert = hasActive && !active?.showChatHeader;

    this.slotElements.forEach((slot) => {
      const slotName = slot.dataset.panelSlot;
      if (slotName === 'header' || slotName === 'header-after') {
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

    if (shouldRestore) {
      const target = this.returnTargets.get(previous);
      if (this.restoreFrame !== undefined) {
        cancelAnimationFrame(this.restoreFrame);
      }
      this.restoreFrame = requestAnimationFrame(() =>
        this.restoreFocus(previous, target)
      );
    }
    for (const panel of this.returnTargets.keys()) {
      if (!panel.isConnected || !panel.hasAttribute('open')) {
        this.returnTargets.delete(panel);
      }
    }

    const isAnyPanelAnimating = panels.some((panelState) =>
      this.isPanelAnimating(panelState.element)
    );
    this.shellRoot.classList.toggle(
      'shell--panels-animating',
      isAnyPanelAnimating
    );
  }

  private onOpenStart = (event: Event) => {
    const panel = event.composedPath()[0] as HTMLElement;
    if (
      panel?.localName === `${prefix}-panel` &&
      !this.returnTargets.has(panel)
    ) {
      this.returnTargets.set(panel, getDeepActiveElement());
    }
    this.updateState();
  };

  private onFocusIn = (event: FocusEvent) => {
    this.focusPath = event.composedPath();
    this.focusedPanel = this.getAssignedPanelElements().find((panel) =>
      this.focusPath.includes(panel)
    );
  };

  private restoreFocus(panel: HTMLElement, target: Element | null | undefined) {
    const focused = getDeepActiveElement();
    if (
      !hasLostPanelFocus(focused, this.focusPath) &&
      !composedContains(panel, focused) &&
      !(this.activePanel && composedContains(this.activePanel, focused))
    ) {
      return;
    }
    if (this.activePanel && this.isPanelAnimating(this.activePanel)) {
      this.restoreFrame = requestAnimationFrame(() =>
        this.restoreFocus(panel, target)
      );
      return;
    }
    if (
      target instanceof HTMLElement &&
      target.isConnected &&
      (!this.activePanel || composedContains(this.activePanel, target))
    ) {
      target.focus();
      if (getDeepActiveElement() === target) {
        return;
      }
    }
    if (!this.activePanel) {
      this.shellRoot.dispatchEvent(
        new CustomEvent(`${prefix}-shell-panel-focus-fallback`, {
          bubbles: true,
          composed: true,
        })
      );
      return;
    }
    for (const node of walkComposedTree(
      this.activePanel,
      Node.ELEMENT_NODE,
      undefined,
      (node) => node instanceof Element && isElementInvisible(node)
    )) {
      if (node instanceof HTMLElement && tryFocus(node)) {
        return;
      }
    }
    const dialog =
      this.activePanel.shadowRoot?.querySelector<HTMLElement>(
        '[role="dialog"]'
      );
    if (dialog) {
      dialog.tabIndex = -1;
      dialog.focus();
    }
  }

  private getAssignedPanelElements(): HTMLElement[] {
    const internalPanels = Array.from(
      this.shellRoot.querySelectorAll<HTMLElement>(
        'cds-aichat-panel[data-internal-panel]'
      )
    );

    const panelsElement = this.panelsSlot
      .assignedElements({ flatten: true })
      .find(
        (element): element is HTMLElement => element instanceof HTMLElement
      );
    const slottedPanels = panelsElement
      ? Array.from(
          panelsElement.querySelectorAll<HTMLElement>('cds-aichat-panel')
        )
      : [];

    const panels = [...internalPanels, ...slottedPanels];
    return Array.from(new Set(panels));
  }

  private getPanelStates(): PanelState[] {
    const panels = this.getAssignedPanelElements();
    return panels.map((element, index) => ({
      element,
      open: element.hasAttribute('open'),
      priority: Number(element.getAttribute('priority') ?? 0),
      showChatHeader: element.hasAttribute('show-chat-header'),
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
    if (!target || target.inert === value) {
      return;
    }
    if (value) {
      target.inert = true;
    } else {
      target.inert = false;
    }
  }

  private isPanelAnimating(panelElement: HTMLElement) {
    return panelElement.classList.contains('panel-container--animating');
  }

  private syncSlotElements() {
    this.slotElements = Array.from(
      this.shellRoot.querySelectorAll<HTMLElement>('[data-panel-slot]')
    );
  }
}
