/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/ai-label/ai-label-action-button.js";

import CDSAILabel from "@carbon/web-components/es/components/ai-label/ai-label.js";
import { createComponent } from "@lit/react";
import React from "react";

const AISlug = createComponent({
  tagName: "cds-ai-label",
  elementClass: CDSAILabel,
  react: React,
});

export { AISlug };
