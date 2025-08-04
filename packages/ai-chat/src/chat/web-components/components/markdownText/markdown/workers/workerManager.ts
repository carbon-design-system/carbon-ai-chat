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

let worker: Worker | null = null;
const requests = new Map<number, (tree: TokenTree | null) => void>();
let requestId = 0;

/**
 * Options for the getMarkdownWorker function.
 */
interface MarkdownWorkerOptions {
  /**
   * The markdown text to process.
   */
  markdown: string;

  /**
   * The previous token tree for diffing optimization. When provided, the markdown
   * processor can perform efficient tree diffing to minimize re-rendering.
   */
  lastTree?: TokenTree;

  /**
   * Whether to enable web worker processing for better performance.
   */
  enableWorkers?: boolean;

  /**
   * Whether to enable debug logging.
   */
  debug?: boolean;

  /**
   * If HTML should be allowed in the markdown content.
   */
  allowHtml?: boolean;
}

/**
 * Lazily renders markdown into a TokenTree tree, using a Web Worker if available and enabled.
 *
 * This function acts as a unified entry point for processing markdown input.
 * In the browser, it will attempt to use a shared Web Worker to offload parsing
 * work off the main thread if enableWorkers is true and workers are supported.
 * Otherwise, it falls back to synchronous in-thread parsing.
 */
async function getMarkdownWorker(
  options: MarkdownWorkerOptions
): Promise<TokenTree> {
  const {
    markdown,
    lastTree,
    enableWorkers = false,
    debug = false,
    allowHtml = true,
  } = options;
  // Check if we should use workers
  const shouldUseWorker =
    enableWorkers &&
    typeof window !== "undefined" &&
    typeof Worker !== "undefined";

  if (shouldUseWorker) {
    // Initialize worker if not already done
    if (!worker) {
      // Try multiple worker creation strategies for maximum compatibility
      worker = tryCreateWorker(debug);

      if (worker) {
        worker.onmessage = (event: MessageEvent) => {
          const [id, tree, error] = event.data;
          const resolver = requests.get(id);
          if (resolver) {
            requests.delete(id);
            if (error) {
              if (debug) {
                console.log("Worker processing error:", error);
              }
              // Could fall back to main thread here, but for now just resolve with null
              resolver(null);
            } else {
              resolver(tree);
            }
          }
        };
        worker.onerror = (error) => {
          if (debug) {
            console.log("Worker error, falling back to main thread:", error);
          }
          worker = null;
        };
      }
    }

    // Use worker if available
    if (worker) {
      return new Promise((resolve) => {
        const id = requestId++;
        requests.set(id, async (result) => {
          if (result === null) {
            // Worker failed, fall back to main thread
            if (debug) {
              console.log(
                "Worker processing failed, falling back to main thread"
              );
            }
            try {
              const fallbackResult = await processInMainThread(
                markdown,
                lastTree
              );
              resolve(fallbackResult);
            } catch (error) {
              if (debug) {
                console.error("Main thread fallback also failed:", error);
              }
              resolve(
                lastTree || {
                  key: "error",
                  token: {
                    type: "error",
                    tag: "",
                    nesting: 0,
                    level: 0,
                    content: "",
                    attrs: null,
                    children: null,
                    markup: "",
                    block: true,
                    hidden: false,
                    map: null,
                    info: "",
                    meta: null,
                  },
                  children: [],
                }
              );
            }
          } else {
            resolve(result);
          }
        });

        worker?.postMessage({
          id,
          markdown,
          lastTree,
        });
      });
    }
  }

  // Main thread processing (default and fallback)
  return processInMainThread(markdown, lastTree, allowHtml);
}

/**
 * Process markdown in the main thread.
 */
async function processInMainThread(
  markdown: string,
  lastTree?: TokenTree,
  allowHtml?: boolean
): Promise<TokenTree> {
  const { parseMarkdown } = await import("../utils/markdown");
  // Parse markdown into tokens, build a tree, then diff it against the previous one
  const tokens = parseMarkdown(markdown, allowHtml);
  const tree = buildTokenTree(tokens);
  return diffTokenTree(lastTree, tree);
}

/**
 * Attempts to create a worker, if it fails we fall back to using main thread.
 */
function tryCreateWorker(debug = false): Worker | null {
  // Even if workers are supported, its possible that the consuming applications build can't find our worker,
  // so we fallback to smain thread instead of worker thread if we error out here.
  try {
    const workerUrl = new URL("./markdownWorker.js", import.meta.url);
    const fileWorker = new Worker(workerUrl, { type: "module" });
    if (debug) {
      console.log("Using external file worker for markdown processing");
    }
    return fileWorker;
  } catch (error) {
    if (debug) {
      console.log("External file worker failed:", error);
    }
  }

  if (debug) {
    console.log("Worker failed to load, will use main thread");
  }
  return null;
}

export { getMarkdownWorker, type MarkdownWorkerOptions };
