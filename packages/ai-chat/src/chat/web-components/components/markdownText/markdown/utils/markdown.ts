/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This gets run in a worker, so don't bring in window/document related things
 * like Lit into this file.
 */

import MarkdownIt, { Token } from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import markdownItSub from "markdown-it-sub";
import markdownItSup from "markdown-it-sup";

const defaultMarkdown = new MarkdownIt({
  html: true,
  breaks: true,
  linkify: true,
})
  .use(markdownItAttrs, {
    leftDelimiter: "{{",
    rightDelimiter: "}}",
    allowedAttributes: ["target", "rel", "class", "id"],
  })
  .use(markdownItSub)
  .use(markdownItSup);

function parseMarkdown(fullText: string): Token[] {
  return defaultMarkdown.parse(fullText, {});
}

export { defaultMarkdown, parseMarkdown };
