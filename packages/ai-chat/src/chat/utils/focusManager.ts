/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { IS_MOBILE } from './browserUtils';
import { doFocus } from './domUtils';
import { consoleError } from './miscUtils';
import type { HasRequestFocus } from '../../types/utilities/HasRequestFocus';

export interface FocusManagerOptions {
  showDisclaimer: boolean;
  iFramePanelIsOpen: boolean;
  viewSourcePanelIsOpen: boolean;
  customPanelIsOpen: boolean;
  responsePanelIsOpen: boolean;
  disclaimer: HTMLElement | null;
  iframePanel: HasRequestFocus | null;
  viewSourcePanel: HasRequestFocus | null;
  customPanel: HasRequestFocus | null;
  responsePanel: HasRequestFocus | null;
  input: HasRequestFocus | null;
}

/** Moves focus to the window's current target, and returns whether it found one to focus. */
export function requestFocus(options: FocusManagerOptions): boolean {
  try {
    if (IS_MOBILE) {
      return false;
    }
    if (options.showDisclaimer) {
      return doFocus(options.disclaimer);
    }
    if (options.iFramePanelIsOpen) {
      return Boolean(options.iframePanel?.requestFocus());
    }
    if (options.viewSourcePanelIsOpen) {
      return Boolean(options.viewSourcePanel?.requestFocus());
    }
    if (options.customPanelIsOpen) {
      return Boolean(options.customPanel?.requestFocus());
    }
    if (options.responsePanelIsOpen) {
      return Boolean(options.responsePanel?.requestFocus());
    }
    return Boolean(options.input?.requestFocus());
  } catch (error) {
    consoleError('An error occurred in MainWindow.requestFocus', error);
    return false;
  }
}
