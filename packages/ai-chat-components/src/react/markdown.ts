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
import CDSAIChatMarkdown from "../components/markdown/src/markdown.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge";

const BaseMarkdown = createComponent({
  tagName: "cds-aichat-markdown",
  elementClass: CDSAIChatMarkdown,
  react: React,
});

const ForwardedMarkdown = React.forwardRef<
  CDSAIChatMarkdown,
  React.ComponentProps<typeof BaseMarkdown> & { markdown?: string }
>(({ children, markdown, ...rest }, forwardedRef) =>
  React.createElement(BaseMarkdown, {
    ...rest,
    ref: forwardedRef,
    markdown:
      markdown ??
      (typeof children === "string" || typeof children === "number"
        ? String(children)
        : undefined),
  }),
);

ForwardedMarkdown.displayName = "Markdown";

const Markdown = withWebComponentBridge(ForwardedMarkdown);

export default Markdown;
