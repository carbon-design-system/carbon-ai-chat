/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, render, type TemplateResult } from "lit";

import { renderTokenTree } from "./utils/renderTokenTree";
import { getMarkdownWorker } from "./workers/workerManager";

function templateToString(result: TemplateResult): string {
  // 1) Create a throw-away <div> (never attached to the real DOM)
  const container = document.createElement("div");
  // 2) Let Lit fully render.
  render(result, container);
  // 3) Grab the HTML it produced..,
  const htmlString = container.innerHTML;
  // 4) (Optional) clean up: clear out the container so we don’t leak memory
  render(html``, container);
  return htmlString;
}
/**
 * Formats the given text content into an HTML string for display in the UI. The provided content may be plain
 * text, it may already contain HTML or it may contain Markdown. Any things that "look like" links will be converted
 * to anchor tags to make links using the auto-linker feature of the markdown library. Existing anchor tags are left
 * unchanged.
 */
async function processMarkdown(value: string, sanitzeHTML = false) {
  const tokenTree = await getMarkdownWorker(value, undefined);
  const renderedTree = await renderTokenTree(tokenTree, sanitzeHTML);
  const html = templateToString(renderedTree);
  return html;
}

export { processMarkdown };
