/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Renders the custom footer slot below a user message. The chat mints the slot name from the local message item, so
 * unlike the assistant-side slot there is nothing in the message data to read it from and no options to honor.
 *
 * This renders a bare forwarding `<slot>` so the message item shell collapses its footer when the host assigns nothing.
 */

import React from 'react';

interface MessageCustomRequestFooterSlotProps {
  /**
   * The name of the slot to render.
   */
  slotName: string;
}

function MessageCustomRequestFooterSlot(
  props: MessageCustomRequestFooterSlotProps
) {
  const { slotName } = props;

  return (
    <slot
      className="cds-aichat--request-footer-slot"
      slot="footer"
      name={slotName}
    />
  );
}

export default React.memo(MessageCustomRequestFooterSlot);
