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
import AutocompleteElement from "../components/autocomplete/src/autocomplete.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";

// TODO: Icon transformation for suggestion items is handled upstream in input-shell.tsx.
// When icon rendering is added to the autocomplete web component, no additional
// React-side transformation is needed here.
const CDSAIChatAutocomplete = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-autocomplete",
    elementClass: AutocompleteElement,
    react: React,
    events: {
      onSelect: "cds-aichat-autocomplete-select",
      onDismiss: "cds-aichat-autocomplete-dismiss",
    },
  }),
);

export default CDSAIChatAutocomplete;
