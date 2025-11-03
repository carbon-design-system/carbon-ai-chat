/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";

// Export the actual class for the component that will *directly* be wrapped with React.
import ChatButton from "../components/chat-button/chat-button.js";

const Button = createComponent({
  tagName: "cds-aichat-button",
  elementClass: ChatButton,
  react: React,
});

export default Button;
