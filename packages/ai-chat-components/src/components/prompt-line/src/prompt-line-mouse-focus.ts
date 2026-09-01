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
 *  - set `this._focusFromMouse = true` in `focus()` before delegating
 */
export abstract class MouseFocusController {
  protected _focusFromMouse = false;
  protected _lastFocusFromMouse = false;

  protected readonly _setMouseFlag = (): void => {
    this._focusFromMouse = true;
  };

  /**
   * Called at the start of the focus event. Consumes `_focusFromMouse`,
   * latches the value into `_lastFocusFromMouse`, and returns it.
   */
  protected _consumeMouseFocus(): boolean {
    const wasMouseFocus = this._focusFromMouse;
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
