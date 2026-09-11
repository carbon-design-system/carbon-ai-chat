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
 */

import React from 'react';

interface CustomRequestFooterSlotProps {
  /**
   * The name of the slot to render.
   */
  slotName: string;
}

function CustomRequestFooterSlot(props: CustomRequestFooterSlotProps) {
  const { slotName } = props;

  return (
    <div className="cds-aichat--request-footer-slot">
      <slot name={slotName} />
    </div>
  );
}

export default React.memo(CustomRequestFooterSlot);
