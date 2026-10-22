/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from '@lit/react';
import React from 'react';

import {
  CDSAIChatWorkspaceShell,
  CDSAIChatWorkspaceShellHeader,
  CDSAIChatWorkspaceShellBody,
  CDSAIChatWorkspaceShellFooter,
} from '../components/aichat-workspace-shell/index.js';

import { withWebComponentBridge } from './utils/withWebComponentBridge.js';

const WorkspaceShell = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatWorkspaceShell.is,
    elementClass: CDSAIChatWorkspaceShell,
    react: React,
  })
);

const WorkspaceShellHeader = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatWorkspaceShellHeader.is,
    elementClass: CDSAIChatWorkspaceShellHeader,
    react: React,
  })
);

const WorkspaceShellBody = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatWorkspaceShellBody.is,
    elementClass: CDSAIChatWorkspaceShellBody,
    react: React,
  })
);

const WorkspaceShellFooter = withWebComponentBridge(
  createComponent({
    tagName: CDSAIChatWorkspaceShellFooter.is,
    elementClass: CDSAIChatWorkspaceShellFooter,
    react: React,
    events: {
      onFooterClicked: 'cds-aichat-workspace-shell-footer-clicked',
    },
  })
);

export default WorkspaceShell;
export { WorkspaceShellHeader, WorkspaceShellBody, WorkspaceShellFooter };
