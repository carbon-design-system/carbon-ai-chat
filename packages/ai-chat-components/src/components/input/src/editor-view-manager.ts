/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EditorState, type Plugin } from "prosemirror-state";
import { EditorView } from "prosemirror-view";

import prefix from "../../../globals/settings.js";
import { IS_PHONE } from "../../../globals/utils/browser-utils.js";
import { inputSchema } from "./prosemirror/schema.js";

/**
 * Callbacks invoked by the manager in response to editor DOM events. Kept as
 * explicit callbacks (rather than DOM events) so the owning shell can trigger
 * Lit reactivity synchronously without needing an intermediate listener.
 */
export interface EditorViewManagerCallbacks {
  /** Editor gained focus; `viaMouse` is true when the focus originated from a
   *  pointer gesture (or a programmatic `focus()` call we made ourselves). */
  onFocus(viaMouse: boolean): void;
  /** Editor lost focus. */
  onBlur(): void;
  /** A keydown fired on the editor. Returning nothing; PM continues handling. */
  onKeydown(event: KeyboardEvent): void;
}

export interface EditorViewManagerOptions {
  /** Host element that the editor container is appended to (light DOM). */
  host: HTMLElement;
  /** Accessible label for the editor's textbox role. */
  ariaLabel: string;
  /** Initial disabled state (the editor will not be editable while true). */
  disabled: boolean;
  /** Plugin array assembled by `createAllPlugins()`. */
  plugins: Plugin[];
  /** DOM-event callbacks. */
  callbacks: EditorViewManagerCallbacks;
}

/**
 * Owns the ProseMirror `EditorView`, its light-DOM container element, and all
 * focus-outline state management.
 *
 * Why light DOM: the editor must be styleable by consumer-supplied CSS and
 * must host custom token renderers that themselves may be custom elements
 * relying on document-scoped styles. Shadow DOM would hide those.
 */
export class EditorViewManager {
  private _options: EditorViewManagerOptions;
  private _view: EditorView | null = null;
  private _container: HTMLElement | null = null;

  /**
   * Tracks the most recent focus-gesture origin. We suppress the browser's
   * focus outline on pointer/programmatic focus but keep it on keyboard tabs,
   * mirroring the :focus-visible UX without relying on that selector (which
   * behaves inconsistently across browsers when focus is inside light DOM
   * owned by a custom element).
   */
  private _focusFromMouse = false;

  private _domEventDisposers: Array<() => void> = [];

  constructor(options: EditorViewManagerOptions) {
    this._options = options;
  }

  /** Builds the container, creates the EditorView, and wires DOM listeners. */
  mount(): void {
    const { host, ariaLabel, disabled, plugins, callbacks } = this._options;

    const container = this._createContainer(ariaLabel);
    host.appendChild(container);
    this._container = container;

    const state = EditorState.create({ schema: inputSchema, plugins });

    this._view = new EditorView(container, {
      state,
      editable: () => !disabled,
      // Apply transactions synchronously to the view's own state. PM requires
      // this glue even when we aren't transforming the transaction.
      dispatchTransaction: (tr) => {
        if (!this._view) {
          return;
        }
        this._view.updateState(this._view.state.apply(tr));
      },
      handleDOMEvents: {
        focus: (view) => {
          // Outline is only desired for keyboard focus. `_focusFromMouse` was
          // flipped on by either a preceding mousedown or our own focus() call.
          if (!this._focusFromMouse) {
            view.dom.style.outline = "";
          }
          this._focusFromMouse = false;
          callbacks.onFocus(false);
          return false;
        },
        blur: (view) => {
          view.dom.style.outline = "none";
          callbacks.onBlur();
          return false;
        },
        keydown: (_view, event) => {
          callbacks.onKeydown(event);
          // Return false so PM's own keymap plugins still run.
          return false;
        },
      },
    });

    applyEditorStyles(this._view.dom, IS_PHONE);
  }

  /** Synchronizes the `editable` gate with the current disabled flag. */
  setDisabled(disabled: boolean): void {
    this._options.disabled = disabled;
    this._view?.setProps({ editable: () => !disabled });
  }

  /**
   * Focuses the editor. Returns `false` if the underlying `focus()` throws
   * (jsdom/happy-dom lack `document.execCommand`, which PM uses internally).
   */
  focus(): boolean {
    if (!this._view) {
      return false;
    }
    // Programmatic focus should not flash the keyboard-only outline.
    this._focusFromMouse = true;
    try {
      this._view.focus();
    } catch {
      return false;
    }
    return true;
  }

  /**
   * Registers an event listener on the editor container and returns a
   * disposer; listeners added here are automatically removed on `destroy()`.
   * Used by the shell to forward PM-emitted custom events.
   */
  addContainerEventListener<K extends string>(
    type: K,
    handler: (event: Event) => void,
  ): () => void {
    const container = this._container;
    if (!container) {
      return () => {};
    }
    container.addEventListener(type, handler as EventListener);
    const disposer = () => {
      container.removeEventListener(type, handler as EventListener);
    };
    this._domEventDisposers.push(disposer);
    return disposer;
  }

  /** The live EditorView, or `null` before mount / after destroy. */
  get view(): EditorView | null {
    return this._view;
  }

  /** The light-DOM host element that PM is mounted into. */
  get container(): HTMLElement | null {
    return this._container;
  }

  /** Destroys the view, removes the container, and disposes listeners. */
  destroy(): void {
    for (const dispose of this._domEventDisposers) {
      dispose();
    }
    this._domEventDisposers = [];

    this._view?.destroy();
    this._view = null;

    this._container?.remove();
    this._container = null;
  }

  private _createContainer(ariaLabel: string): HTMLElement {
    const container = document.createElement("div");
    container.slot = "editor";
    container.className = `${prefix}--input-textarea`;
    container.setAttribute("role", "textbox");
    container.setAttribute("aria-label", ariaLabel);
    container.setAttribute("aria-multiline", "true");
    container.setAttribute("spellcheck", "true");
    // mousedown fires before focus; flip the flag so the upcoming focus event
    // knows not to show the keyboard-focus outline.
    container.addEventListener("mousedown", () => {
      this._focusFromMouse = true;
    });
    return container;
  }
}

/**
 * Apply the editor's intrinsic typography and reset styles directly to the PM
 * content node via CSSOM.
 *
 * These can't live in the shell's shadow DOM because `::slotted()` only
 * reaches the top-level slotted node, not PM's inner contenteditable div. We
 * could inject a `<style>` element next to the container, but that interacts
 * poorly with strict CSP policies consumers may have in place. CSSOM writes
 * are equivalent to inline styles and don't need a style-src allowance.
 *
 * Exported for unit testing.
 */
export function applyEditorStyles(pmDom: HTMLElement, isPhone: boolean): void {
  Object.assign(pmDom.style, {
    border: "none",
    margin: "0",
    background: "transparent",
    color: "var(--cds-text-primary, #161616)",
    outline: "none",
    whiteSpace: "pre-wrap",
    wordWrap: "break-word",
    fontSize: "var(--cds-body-01-font-size, 0.875rem)",
    fontWeight: "var(--cds-body-01-font-weight, 400)",
    letterSpacing: "var(--cds-body-01-letter-spacing, 0.16px)",
    lineHeight: "var(--cds-body-01-line-height, 1.42857)",
  });
  if (isPhone) {
    Object.assign(pmDom.style, {
      fontSize: "var(--cds-body-02-font-size, 1rem)",
      fontWeight: "var(--cds-body-02-font-weight, 400)",
      letterSpacing: "var(--cds-body-02-letter-spacing, 0)",
      lineHeight: "var(--cds-body-02-line-height, 1.5)",
    });
  }
}
