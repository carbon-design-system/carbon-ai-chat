/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  CustomPanelConfigOptions,
  DefaultCustomPanelConfigOptions,
} from "../../instance/apiTypes";

/**
 * The state of the custom panel.
 */
interface CustomPanelState {
  /**
   * Determines if the custom panel should be open.
   */
  isOpen: boolean;

  /**
   * The id of the panel that is currently in focus.
   */
  panelID: string;

  /**
   * Config options for the custom panels.
   */
  options: CustomPanelConfigOptions | DefaultCustomPanelConfigOptions;
}

export type { CustomPanelState };
