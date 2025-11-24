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
import CDSAIChatCodeSnippetTileContainer from "../components/code-snippet/src/code-snippet-tile-container.js";

const CodeSnippetTileContainer = createComponent({
  tagName: "cds-aichat-code-snippet-tile-container",
  elementClass: CDSAIChatCodeSnippetTileContainer,
  react: React,
  events: {
    onChange: "content-change",
  },
});

export default CodeSnippetTileContainer;
