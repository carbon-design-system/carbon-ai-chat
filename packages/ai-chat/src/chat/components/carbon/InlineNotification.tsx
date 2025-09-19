/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import CarbonInlineNotificationElement from "@carbon/web-components/es/components/notification/inline-notification.js";

const InlineNotification = createComponent({
  tagName: "cds-inline-notification",
  elementClass: CarbonInlineNotificationElement,
  react: React,
}) as React.ForwardRefExoticComponent<
  React.HTMLAttributes<HTMLElement> & {
    kind?: string;
    lowContrast?: boolean;
    hideCloseButton?: boolean;
  }
>;

export default InlineNotification;
