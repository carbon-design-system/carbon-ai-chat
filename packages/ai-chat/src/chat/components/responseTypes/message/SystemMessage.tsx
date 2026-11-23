/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { useSelector } from '../../../hooks/useSelector';
import { AppState } from '../../../../types/state/AppState';

interface SystemMessageProps {
  /**
   * If true, renders the "response stopped" indicator.
   */
  responseStopped?: boolean;
}

/**
 * Component for rendering the legacy "response stopped" indicator.
 */
function SystemMessage({ responseStopped = false }: SystemMessageProps) {
  const messages_responseStopped = useSelector(
    (state: AppState) => state.languagePack.messages_responseStopped
  );

  if (responseStopped) {
    return (
      <div className="cds-aichat--system-message-response-stopped">
        {messages_responseStopped}
      </div>
    );
  }

  return null;
}

export { SystemMessage };
