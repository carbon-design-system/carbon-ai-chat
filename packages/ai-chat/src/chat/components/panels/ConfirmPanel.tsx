/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useRef } from 'react';
import ChatPanel from '@carbon/ai-chat-components/es/react/panel.js';
import Button, { BUTTON_KIND } from '../carbon/Button';
import { focusOnFirstFocusableElement } from '../../utils/domUtils';
import { useAriaAnnouncer } from '../../hooks/useAriaAnnouncer';

export interface ConfirmPanelButtonProps {
  onConfirm: () => void;
  onCancel: () => void;
}

interface ConfirmPanelProps extends ConfirmPanelButtonProps {
  open: boolean;
  priority: number;
  title: string;
  message: string;
  cancelButtonLabel: string;
  confirmButtonLabel: string;
  announceMessage: string;
}

export function ConfirmPanel({
  open,
  priority,
  title,
  message,
  cancelButtonLabel,
  confirmButtonLabel,
  announceMessage,
  onConfirm,
  onCancel,
}: ConfirmPanelProps) {
  const footerRef = useRef<HTMLDivElement>(null);
  const announce = useAriaAnnouncer();

  return (
    <ChatPanel
      open={open}
      priority={priority}
      fullWidth
      showChatHeader={false}
      panelAriaLabel={title}
      onOpenEnd={(event: CustomEvent<{ isReactivation: boolean }>) => {
        if (event.detail?.isReactivation) {
          return;
        }
        focusOnFirstFocusableElement(footerRef.current);
        announce?.(announceMessage);
      }}
      onKeyDown={(event: React.KeyboardEvent) => {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopPropagation();
          onCancel();
        }
      }}>
      <div slot="body" className="cds-aichat--confirm-panel__content">
        <h2 className="cds-aichat--confirm-panel__title">{title}</h2>
        <p className="cds-aichat--confirm-panel__message">{message}</p>
      </div>
      <div
        slot="footer"
        ref={footerRef}
        className="cds-aichat--confirm-panel__footer">
        <Button
          className="cds-aichat--confirm-panel__button"
          kind={BUTTON_KIND.SECONDARY}
          size="lg"
          onClick={onCancel}>
          {cancelButtonLabel}
        </Button>
        <Button
          className="cds-aichat--confirm-panel__button"
          size="lg"
          onClick={onConfirm}>
          {confirmButtonLabel}
        </Button>
      </div>
    </ChatPanel>
  );
}
