/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessagePresentationPort } from '../presentationPort';

interface SendPresentationCapabilities {
  hasCustomPromptLine(): boolean;
  announceSending(): void;
  requestComposerFocus(): boolean;
  isHomeScreenOpen(): boolean;
  closeHomeScreen(): void;
  isResponsePanelOpen(): boolean;
  closeResponsePanel(): void;
}

class MessagePresentationAdapter implements MessagePresentationPort {
  constructor(private capabilities: SendPresentationCapabilities) {}

  hasCustomPromptLine() {
    return this.capabilities.hasCustomPromptLine();
  }

  announceSending() {
    this.capabilities.announceSending();
  }

  requestComposerFocus() {
    this.capabilities.requestComposerFocus();
  }

  closeHomeScreenIfOpen() {
    if (this.capabilities.isHomeScreenOpen()) {
      this.capabilities.closeHomeScreen();
    }
  }

  closeResponsePanelIfOpen() {
    if (this.capabilities.isResponsePanelOpen()) {
      this.capabilities.closeResponsePanel();
    }
  }

  closeHomeScreen() {
    this.capabilities.closeHomeScreen();
  }
}

export { MessagePresentationAdapter };
