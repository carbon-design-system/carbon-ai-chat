/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Shared mouse-focus tracking used by both `TextareaController` and
 * `RichController`. Pointer/touch events before focus mark it as mouse-driven
 * so the keyboard-focus outline is suppressed.
 *
 * Subclasses should:
 *  - call `this._attachMouseFocusListeners(host)` in `mount()`
 *  - call `this._detachMouseFocusListeners(host)` in `destroy()`
 *  - call `this._consumeMouseFocus()` when the focus event fires to get the
 *    `wasMouseFocus` boolean and latch it into `_lastFocusFromMouse`
 *  - call `this._setNextFocusOrigin(keyboardFocus)` in `focus(keyboardFocus)` before delegating
 */
export abstract class MouseFocusController {
  protected _focusFromMouse = false;
  protected _lastFocusFromMouse = false;
  /**
   * Set by `focus(keyboardFocus)` to pin the keyboard value for the next focus
   * event, bypassing pointer-event tracking. Takes priority over
   * `_focusFromMouse` so a programmatic focus call cannot be clobbered by a
   * synthetic pointer event fired during the same `.focus()` call (observed in
   * Chromium/Firefox headless).
   */
  private _nextFocusOriginKeyboard: boolean | null = null;

  protected readonly _setMouseFlag = (): void => {
    this._focusFromMouse = true;
  };

  /** Pins the keyboard value for the next focus event. Call this in
   * `focus(keyboardFocus)` before delegating to the native `.focus()`. */
  protected _setNextFocusOrigin(keyboard: boolean): void {
    this._nextFocusOriginKeyboard = keyboard;
  }

  /**
   * Called at the start of the focus event. Consumes `_focusFromMouse` (or the
   * pinned origin set by `_setNextFocusOrigin()`), latches the result into
   * `_lastFocusFromMouse`, and returns whether focus was mouse-driven.
   */
  protected _consumeMouseFocus(): boolean {
    let wasMouseFocus: boolean;
    if (this._nextFocusOriginKeyboard !== null) {
      wasMouseFocus = !this._nextFocusOriginKeyboard;
      this._nextFocusOriginKeyboard = null;
    } else {
      wasMouseFocus = this._focusFromMouse;
    }
    this._focusFromMouse = false;
    this._lastFocusFromMouse = wasMouseFocus;
    return wasMouseFocus;
  }

  getKeyboardFocus(): boolean {
    return !this._lastFocusFromMouse;
  }

  protected _attachMouseFocusListeners(host: HTMLElement): void {
    host.addEventListener('pointerdown', this._setMouseFlag);
    host.addEventListener('mousedown', this._setMouseFlag);
    host.addEventListener('touchstart', this._setMouseFlag);
  }

  protected _detachMouseFocusListeners(host: HTMLElement): void {
    host.removeEventListener('pointerdown', this._setMouseFlag);
    host.removeEventListener('mousedown', this._setMouseFlag);
    host.removeEventListener('touchstart', this._setMouseFlag);
  }
}
