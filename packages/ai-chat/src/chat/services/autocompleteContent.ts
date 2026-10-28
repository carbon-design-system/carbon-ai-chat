/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface AutocompleteContentCallbacks {
  onReady(list: HTMLElement): void;
  onClear(): void;
  onError(error: unknown): void;
}

interface AutocompleteContentRecord {
  readonly owner: object;
  readonly revision: object;
  readonly generation: number;
  readonly kind: 'react' | 'element';
  readonly content: unknown;
  readonly target: HTMLElement;
  readonly anchor: HTMLElement;
}

interface ContentEntry {
  request: AutocompleteContentRecord;
  callbacks: AutocompleteContentCallbacks;
  placed: boolean;
  attempt: number;
  routingCleared: boolean;
  readyTarget?: HTMLElement;
  retireReady?: () => void;
}

interface AutocompleteContentSnapshot {
  readonly request: AutocompleteContentRecord | null;
}

const EMPTY: AutocompleteContentSnapshot = Object.freeze({ request: null });
let nextSlot = 0;

/** One chat's custom-list DOM lifetime, separate from suggestion resolution. */
class AutocompleteContent {
  private connected = false;
  private owner?: object;
  private generation = 0;
  private entry?: ContentEntry;
  private snapshot = EMPTY;
  private listeners = new Set<() => void>();
  private host?: HTMLDivElement;
  private slot?: HTMLSlotElement;
  private element?: HTMLElement;
  private elementAnchor?: HTMLElement;
  private elementPlaced = false;
  private elementObserver?: MutationObserver;

  constructor(private readonly chatWrapper: HTMLElement | undefined) {}

  getSnapshot = (): AutocompleteContentSnapshot => this.snapshot;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    if (this.owner) {
      this.release(this.owner);
    }
    this.connected = false;
  }

  ownsView(element: HTMLElement): boolean {
    return Boolean(
      this.chatWrapper?.shadowRoot &&
      element.getRootNode() === this.chatWrapper.shadowRoot
    );
  }

  claim(owner: object): void {
    if (this.owner !== owner) {
      if (this.owner) {
        this.release(this.owner);
      }
      this.owner = owner;
    }
  }

  prepare(
    owner: object,
    revision: object,
    content: unknown,
    anchor: HTMLElement,
    callbacks: AutocompleteContentCallbacks
  ): AutocompleteContentRecord | undefined {
    if (!this.connected || this.owner !== owner) {
      return undefined;
    }
    if (content == null) {
      this.clear(owner);
      return undefined;
    }
    const kind: AutocompleteContentRecord['kind'] =
      content instanceof HTMLElement ? 'element' : 'react';
    const previous = this.entry;
    if (
      previous?.request.revision === revision &&
      previous.request.content === content &&
      previous.request.anchor === anchor
    ) {
      previous.callbacks = callbacks;
      return previous.request;
    }
    if (previous) {
      this.invalidateReady(previous.request);
      if (this.entry !== previous || this.owner !== owner) {
        return undefined;
      }
      if (
        previous.request.kind !== kind ||
        previous.request.anchor !== anchor
      ) {
        this.releaseDom();
      }
    }
    let target: HTMLElement;
    if (kind === 'react') {
      if (!this.host) {
        this.host = document.createElement('div');
        this.slot = document.createElement('slot');
        this.slot.name = `cds-aichat-native-autocomplete-${++nextSlot}`;
        this.host.slot = this.slot.name;
        this.host.addEventListener('mousedown', this.preventMousedown);
      }
      target = this.host;
    } else {
      target = content as HTMLElement;
      if (this.element !== target) {
        this.releaseElement();
        this.element = target;
        this.elementAnchor = anchor;
      }
    }
    const request = Object.freeze({
      owner,
      revision,
      generation: ++this.generation,
      kind,
      content,
      target,
      anchor,
    });
    this.entry = {
      request,
      callbacks,
      placed: false,
      attempt: 0,
      routingCleared: true,
    };
    this.publish();
    return request;
  }

  markPlaced(request: AutocompleteContentRecord): boolean {
    const entry = this.current(request);
    if (
      !entry ||
      !request.anchor.isConnected ||
      !this.ownsView(request.anchor)
    ) {
      return false;
    }
    if (entry.placed && this.isPlaced(request)) {
      return true;
    }
    if (request.kind === 'react') {
      if (this.slot.parentElement !== request.anchor) {
        request.anchor.appendChild(this.slot);
      }
      if (this.host.parentElement !== this.chatWrapper) {
        this.chatWrapper.appendChild(this.host);
      }
    } else {
      // A consumer that adopted the borrowed element keeps it until this list
      // lifetime ends; unrelated view updates must not take it back.
      if (this.elementPlaced && this.element.parentElement !== request.anchor) {
        return false;
      }
      if (!this.elementPlaced) {
        request.anchor.appendChild(this.element);
        this.elementPlaced = true;
      }
      this.elementObserver?.disconnect();
      this.elementObserver = new MutationObserver(() => {
        if (
          this.current(request) &&
          this.element.parentElement !== request.anchor
        ) {
          this.invalidateReady(request);
          entry.placed = false;
          this.publish();
        }
      });
      this.elementObserver.observe(request.anchor, { childList: true });
    }
    entry.placed = true;
    if (!this.isPlaced(request)) {
      entry.placed = false;
      return false;
    }
    this.publish();
    if (request.kind === 'element') {
      void this.commit(request);
    }
    return true;
  }

  isPlaced(request: AutocompleteContentRecord): boolean {
    const entry = this.current(request);
    if (
      !entry?.placed ||
      !request.anchor.isConnected ||
      !this.ownsView(request.anchor)
    ) {
      return false;
    }
    return request.kind === 'element'
      ? request.target.isConnected &&
          request.target.parentElement === request.anchor
      : request.target.isConnected &&
          request.target.parentElement === this.chatWrapper &&
          this.slot?.parentElement === request.anchor &&
          request.target.assignedSlot === this.slot;
  }

  isReady(request: AutocompleteContentRecord): boolean {
    const entry = this.current(request);
    return Boolean(
      entry &&
      !entry.routingCleared &&
      this.isPlaced(request) &&
      entry.readyTarget === this.listFor(request)
    );
  }

  async commit(request: AutocompleteContentRecord): Promise<boolean> {
    const entry = this.current(request);
    if (!entry || !this.isPlaced(request)) {
      return false;
    }
    const list = this.listFor(request);
    if (this.isReady(request)) {
      return true;
    }
    entry.retireReady?.();
    const attempt = ++entry.attempt;
    let retireReady: () => void;
    try {
      const update = (
        list as HTMLElement & { updateComplete?: Promise<unknown> }
      ).updateComplete;
      if (update) {
        const retired = new Promise<boolean>((resolve) => {
          retireReady = () => resolve(false);
        });
        entry.retireReady = retireReady;
        if (
          !(await Promise.race([
            Promise.resolve(update).then(() => true),
            retired,
          ]))
        ) {
          return false;
        }
      }
      if (
        this.current(request) !== entry ||
        entry.attempt !== attempt ||
        !this.isPlaced(request) ||
        this.listFor(request) !== list
      ) {
        return false;
      }
      entry.readyTarget = list;
      entry.routingCleared = false;
      entry.callbacks.onReady(list);
      return this.isReady(request);
    } catch (error) {
      if (this.current(request) === entry && entry.attempt === attempt) {
        this.fail(request, error);
      }
      return false;
    } finally {
      if (entry.retireReady === retireReady) {
        entry.retireReady = undefined;
      }
    }
  }

  invalidateReady(request: AutocompleteContentRecord): void {
    const entry = this.current(request);
    if (!entry) {
      return;
    }
    entry.attempt += 1;
    entry.retireReady?.();
    entry.retireReady = undefined;
    entry.readyTarget = undefined;
    if (!entry.routingCleared) {
      entry.routingCleared = true;
      try {
        entry.callbacks.onClear();
      } catch (error) {
        this.fail(request, error);
      }
    }
  }

  fail(request: AutocompleteContentRecord, error: unknown): void {
    const entry = this.current(request);
    if (!entry) {
      return;
    }
    const { callbacks } = entry;
    this.retireEntry();
    callbacks.onError(error);
  }

  pause(owner: object): void {
    const entry = this.entry;
    if (this.owner !== owner || !entry) {
      return;
    }
    this.invalidateReady(entry.request);
    if (this.entry !== entry) {
      return;
    }
    entry.request = Object.freeze({
      ...entry.request,
      generation: ++this.generation,
    });
    entry.placed = false;
    this.publish();
  }

  clear(owner: object): void {
    if (this.owner !== owner) {
      return;
    }
    const result = this.retireEntry();
    if (result.failed) {
      result.callbacks?.onError(result.error);
    }
  }

  private retireEntry(): {
    callbacks?: AutocompleteContentCallbacks;
    failed?: boolean;
    error?: unknown;
  } {
    const entry = this.entry;
    if (!entry && !this.host && !this.element) {
      return {};
    }
    this.entry = undefined;
    let failed = false;
    let error: unknown;
    if (entry) {
      entry.attempt += 1;
      entry.retireReady?.();
      entry.retireReady = undefined;
      if (!entry.routingCleared) {
        entry.routingCleared = true;
        try {
          entry.callbacks.onClear();
        } catch (caught) {
          failed = true;
          error = caught;
        }
      }
    }
    this.releaseDom();
    this.publish();
    return { callbacks: entry?.callbacks, failed, error };
  }

  release(owner: object): void {
    if (this.owner !== owner) {
      return;
    }
    this.clear(owner);
    if (this.owner === owner) {
      this.owner = undefined;
    }
  }

  private current(
    request: AutocompleteContentRecord
  ): ContentEntry | undefined {
    return this.connected &&
      this.owner === request.owner &&
      this.entry?.request === request
      ? this.entry
      : undefined;
  }

  private listFor(request: AutocompleteContentRecord): HTMLElement {
    return request.kind === 'element'
      ? request.target
      : ((request.target.firstElementChild as HTMLElement) ?? request.target);
  }

  private readonly preventMousedown = (event: MouseEvent) => {
    event.preventDefault();
  };

  private releaseElement(): void {
    this.elementObserver?.disconnect();
    this.elementObserver = undefined;
    if (this.element && this.element.parentElement === this.elementAnchor) {
      this.element.remove();
    }
    this.element = undefined;
    this.elementAnchor = undefined;
    this.elementPlaced = false;
  }

  private releaseDom(): void {
    this.releaseElement();
    this.host?.removeEventListener('mousedown', this.preventMousedown);
    this.host?.remove();
    this.slot?.remove();
    this.host = undefined;
    this.slot = undefined;
  }

  private publish(): void {
    this.snapshot = this.entry
      ? Object.freeze({ request: this.entry.request })
      : EMPTY;
    this.listeners.forEach((listener) => listener());
  }
}

export { AutocompleteContent };
