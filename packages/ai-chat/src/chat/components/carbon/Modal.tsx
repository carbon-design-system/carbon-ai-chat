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
import CarbonModalElement from "@carbon/web-components/es/components/modal/modal.js";
import CarbonModalBodyElement from "@carbon/web-components/es/components/modal/modal-body.js";

const Modal = createComponent({
  tagName: "cds-modal",
  elementClass: CarbonModalElement,
  react: React,
  events: {
    onClose: "cds-modal-closed",
  },
});

const ModalBody = createComponent({
  tagName: "cds-modal-body",
  elementClass: CarbonModalBodyElement,
  react: React,
});

export default Modal;
export { ModalBody };
