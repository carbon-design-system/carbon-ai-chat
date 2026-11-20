/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatMountState } from './chatMountState';
import type { ServiceManager } from '../../sdk/services/ServiceManager';
import type { FileUpload } from '../../types/state/AppState';
import { openPrompt } from '../state';
import { chatStore } from './attachChatView';

export class HumanAgentCallbacks {
  private serviceManager: ServiceManager;

  constructor(mountState: ChatMountState) {
    this.serviceManager = mountState.serviceManager;
  }

  /**
   * Asks whether to end the agent chat. The prompt lives as long as the chat,
   * so its answer closes over the chat, not this mount.
   */
  showConfirmEndChat = () => {
    const { serviceManager } = this;
    openPrompt(
      chatStore(serviceManager),
      { kind: 'endChat' },
      { onConfirm: () => serviceManager.humanAgentService.endChat(true) }
    );
  };

  onUserTyping = (isTyping: boolean) => {
    if (this.serviceManager.instance.state.get().humanAgent.isConnected) {
      this.serviceManager.humanAgentService.userTyping(isTyping);
    }
  };

  onFilesSelectedForUpload(
    uploads: FileUpload[],
    isConnectingOrConnected: boolean,
    allowMultipleFileUploads: boolean,
    requestInputFocus: () => void
  ) {
    if (isConnectingOrConnected) {
      this.serviceManager.humanAgentService.filesSelectedForUpload(uploads);
      if (!allowMultipleFileUploads) {
        requestInputFocus();
      }
    }
  }
}
