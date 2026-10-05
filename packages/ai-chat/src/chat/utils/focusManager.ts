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
  shouldAutoFocus: boolean;
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

export function requestFocus(options: FocusManagerOptions): void {
  try {
    if (!options.shouldAutoFocus || IS_MOBILE) {
      return;
    }
    if (options.showDisclaimer) {
      doFocus(options.disclaimer);
    } else if (options.iFramePanelIsOpen) {
      options.iframePanel?.requestFocus();
    } else if (options.viewSourcePanelIsOpen) {
      options.viewSourcePanel?.requestFocus();
    } else if (options.customPanelIsOpen) {
      options.customPanel?.requestFocus();
    } else if (options.responsePanelIsOpen) {
      options.responsePanel?.requestFocus();
    } else {
      options.input?.requestFocus();
    }
  } catch (error) {
    consoleError('An error occurred in MainWindow.requestFocus', error);
  }
}
