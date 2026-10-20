/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { defineCustomElement } from '../../globals/register.js';
import '../aichat-truncated-text/index.js';
import CDSAIChatWorkspaceShellBody from './aichat-workspace-shell-body.js';
import CDSAIChatWorkspaceShellFooter from './aichat-workspace-shell-footer.js';
import CDSAIChatWorkspaceShellHeader from './aichat-workspace-shell-header.js';
import CDSAIChatWorkspaceShell from './aichat-workspace-shell.js';

export {
  CDSAIChatWorkspaceShellBody,
  CDSAIChatWorkspaceShellFooter,
  CDSAIChatWorkspaceShellHeader,
  CDSAIChatWorkspaceShell,
};

defineCustomElement(CDSAIChatWorkspaceShellBody);
defineCustomElement(CDSAIChatWorkspaceShellFooter);
defineCustomElement(CDSAIChatWorkspaceShellHeader);
defineCustomElement(CDSAIChatWorkspaceShell);

export type { WorkspaceHeaderToggleEventDetail } from './aichat-workspace-shell-header.js';

export type { Action } from './aichat-workspace-shell-footer.js';
