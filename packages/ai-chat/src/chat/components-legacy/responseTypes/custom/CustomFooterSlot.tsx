/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This component is used to render a custom footer slot for a message. Unlike user-defined responses,
 * the slot name is provided by the server in the message data, so no registry is needed.
 * The slot element is rendered directly using the slot_name from the message options.
 */

import React from "react";

import { GenericItemCustomFooterSlotOptions } from "../../../../types/messaging/Messages";

interface CustomFooterSlotProps {
  /**
   * The custom footer slot config options
   */
  footerOptions: GenericItemCustomFooterSlotOptions;
}

function CustomFooterSlot(props: CustomFooterSlotProps) {
  const { footerOptions } = props;

  // Don't render if is_on is false
  if (footerOptions.is_on === false) {
    return null;
  }

  return (
    <div className="cds-aichat--message-custom-footer-slot">
      <slot name={footerOptions.slot_name} />
    </div>
  );
}

export default React.memo(CustomFooterSlot);
