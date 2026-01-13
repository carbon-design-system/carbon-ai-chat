import { loadCodeSnippetDeps } from "../components/code-snippet/src/codemirror/codemirror-loader.js";
import { loadTableDeps } from "../components/table/src/table-loader.js";
/**
 * Preloads all lazily loaded dependencies so test environments (like Jest)
 * can ensure the heavy components are ready before rendering.
 *
 * Consumers can call this once during their test setup files.
 */
export declare function loadAllLazyDeps(): Promise<void>;
export { loadCodeSnippetDeps, loadTableDeps };
