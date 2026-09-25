/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from './ServiceManager';
import type { FileUpload } from '../../types/state/AppState';

export class HumanAgentCallbacks {
  private showEndChatConfirmation = false;
  private listeners = new Set<() => void>();
  private focusTimers = new Set<ReturnType<typeof setTimeout>>();

  constructor(
    private serviceManager: ServiceManager,
    private focusInput: () => void
  ) {}

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  getSnapshot = () => this.showEndChatConfirmation;

  disconnect = () => {
    this.focusTimers.forEach(clearTimeout);
    this.focusTimers.clear();
  };

  private setConfirmation(value: boolean) {
    if (this.showEndChatConfirmation !== value) {
      this.showEndChatConfirmation = value;
      this.listeners.forEach((listener) => listener());
    }
  }

  showConfirmEndChat = () => {
    this.setConfirmation(true);
  };

  hideConfirmEndChat = () => {
    this.setConfirmation(false);
    const timer = setTimeout(() => {
      this.focusTimers.delete(timer);
      this.focusInput();
    });
    this.focusTimers.add(timer);
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
