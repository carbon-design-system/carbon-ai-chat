/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { WorkspaceCustomPanelConfigOptions } from "../../instance/apiTypes";
import { LocalMessageItem } from "../../messaging/LocalMessageItem";
import { Message } from "../../messaging/Messages";

/**
 * The state of the workspace panel.
 */
interface WorkspacePanelState {
  /**
   * Determines if the custom panel should be open.
   */
  isOpen: boolean;

  /**
   * The id of the workspace attached to this panel. Used to match with a given Preview Card.
   */
  workspaceID?: string;

  /**
   * The id of the panel that is currently in focus.
   */
  panelID: string;

  /**
   * Config options for the workspace panels.
   */
  options: WorkspaceCustomPanelConfigOptions;

  /**
   * The local message item that triggered the workspace panel to open.
   */
  localMessageItem?: LocalMessageItem;

  /**
   * The full message response that contains the message item.
   */
  fullMessage?: Message;

  /**
   * Additional metadata associated with the workspace.
   */
  additionalData?: unknown;
}

export type { WorkspacePanelState };
