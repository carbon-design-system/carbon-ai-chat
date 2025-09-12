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
import CarbonActionableNotificationButtonElement from "@carbon/web-components/es/components/notification/actionable-notification-button.js";

const ActionableNotificationButton = createComponent({
  tagName: "cds-actionable-notification-button",
  elementClass: CarbonActionableNotificationButtonElement,
  react: React,
});

export default ActionableNotificationButton;
