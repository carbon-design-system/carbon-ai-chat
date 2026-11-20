/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ChatViewState } from './chatViewState';
import type { ServiceManager } from './ServiceManager';
import type { FileUpload } from '../../types/state/AppState';

export class HumanAgentCallbacks {
  private serviceManager: ServiceManager;

  constructor(private viewState: ChatViewState) {
    this.serviceManager = viewState.serviceManager;
  }

  showConfirmEndChat = () => {
    this.viewState.showEndChatConfirmation();
  };

  hideConfirmEndChat = () => {
    this.viewState.hideEndChatConfirmation();
  };

  confirmHumanAgentEndChat = () => {
    this.hideConfirmEndChat();
    this.serviceManager.humanAgentService.endChat(true);
  };

  onUserTyping = (isTyping: boolean) => {
    if (
      this.serviceManager.store.getState().persistedToBrowserStorage
        .humanAgentState.isConnected
    ) {
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
