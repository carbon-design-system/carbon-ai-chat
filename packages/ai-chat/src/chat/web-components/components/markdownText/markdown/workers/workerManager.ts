/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  type TokenTree,
  buildTokenTree,
  diffTokenTree,
} from "../utils/tokenTree";

/**
 * Loads in web worker that handles processing markdown into a tree and then diffing the tree
 * on updates.
 */

// let worker: Worker | null = null;
// const requests = new Map<number, (tree: any) => void>();
// let requestId = 0;

/**
 * Lazily renders markdown into a TokenTree tree, using a Web Worker if available.
 *
 * FOR NOW WE ARE DISABLING THE WORKER VERSION UNTIL WE ARE SURE FOLKS CAN BUILD IT SAFELY.
 *
 * This function acts as a unified entry point for processing markdown input.
 * In the browser, it will attempt to use a shared Web Worker to offload parsing
 * work off the main thread. If Web Workers are unavailable (e.g., during server-side
 * rendering or in test environments), it falls back to synchronous in-thread parsing.
 *
 * This design ensures that:
 * - Markdown is rendered progressively and non-blocking in the browser
 * - Server-rendered environments don't error out or import unnecessary browser APIs
 * - Tree diffs preserve DOM stability for fast updates
 */
async function getMarkdownWorker(
  markdown: string,
  lastTree: any,
  allowHtml = true
): Promise<TokenTree> {
  // FOR NOW WE ARE ONLY DOING IT THIS WAY WITHOUT A WORKER.
  // If we're in an SSR context, or the browser doesn't support Workers,
  // fall back to in-thread parsing using dynamically imported utilities.
  // if (typeof window === "undefined" || typeof Worker === "undefined") {
  const { parseMarkdown } = await import("../utils/markdown");

  // Parse markdown into tokens, build a tree, then diff it against the previous one
  const tokens = parseMarkdown(markdown, allowHtml);
  const tree = buildTokenTree(tokens);
  return diffTokenTree(lastTree, tree);
  // }

  // Load in the web worker for processing markdown into a tree if it isn't already loaded.
  /* if (!worker && typeof Worker !== "undefined") {
    const workerUrl = new URL("./markdownWorker.js", import.meta.url);
    worker = new Worker(workerUrl, { type: "module" });
    worker.onmessage = (event: MessageEvent) => {
      const [id, tree] = event.data;
      requests.get(id)?.(tree);
      requests.delete(id);
    };
  }

  // In the browser with a worker: post a message and await the result
  return new Promise((resolve) => {
    const id = requestId++;
    requests.set(id, resolve);

    worker.postMessage({
      id,
      markdown,
      lastTree,
    });
  });*/
}

export { getMarkdownWorker };
