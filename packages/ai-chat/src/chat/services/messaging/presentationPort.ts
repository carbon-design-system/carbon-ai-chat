/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface MessagePresentationPort {
  getUserDefinedResponseSlot?(messageItemID: string): string | undefined;
  hasCustomPromptLine(): boolean;
  announceSending(): void;
  requestComposerFocus(): void;
  closeHomeScreenIfOpen(): void;
  closeResponsePanelIfOpen(): void;
  closeHomeScreen(): void;
}

export type { MessagePresentationPort };
