/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { composedContains } from '@carbon/ai-chat-components/es/globals/utils/focus-utils.js';
import { IS_MOBILE } from '../../sdk/utils/browserUtils';
import { doFocus, getDeepActiveElement } from './domUtils';
import { consoleError } from '../../sdk/utils/miscUtils';
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

/**
 * Focuses the best place in the open chat.
 *
 * @returns Whether it found a place to focus. A target may finish taking focus
 * a frame later, as the rich editor does.
 */
export function requestFocus(options: FocusManagerOptions): boolean {
  try {
    if (!options.shouldAutoFocus || IS_MOBILE) {
      return false;
    }
    if (options.showDisclaimer) {
      const { disclaimer } = options;
      if (!disclaimer) {
        return false;
      }
      doFocus(disclaimer);
      // The accept button delegates focus into its shadow root.
      return composedContains(disclaimer, getDeepActiveElement());
    }
    let target: HasRequestFocus | null;
    if (options.iFramePanelIsOpen) {
      target = options.iframePanel;
    } else if (options.viewSourcePanelIsOpen) {
      target = options.viewSourcePanel;
    } else if (options.customPanelIsOpen) {
      target = options.customPanel;
    } else if (options.responsePanelIsOpen) {
      target = options.responsePanel;
    } else {
      target = options.input;
    }
    return target?.requestFocus() === true;
  } catch (error) {
    consoleError('An error occurred in MainWindow.requestFocus', error);
    return false;
  }
}
