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
import CDSAIChatMarkdown from "../components/markdown/src/cds-aichat-markdown.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const Markdown = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-markdown",
    elementClass: CDSAIChatMarkdown,
    react: React,
  }),
);

export default Markdown;
