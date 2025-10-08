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
import CarbonActionableNotificationElement from "@carbon/web-components/es/components/notification/actionable-notification.js";

const ActionableNotification = createComponent({
  tagName: "cds-actionable-notification",
  elementClass: CarbonActionableNotificationElement,
  react: React,
  events: {
    onNotificationBeingClosed: "cds-notification-beingclosed",
    onNotificationClosed: "cds-notification-closed",
  },
});

export default ActionableNotification;
export { NOTIFICATION_KIND } from "@carbon/web-components/es/components/notification/defs.js";
