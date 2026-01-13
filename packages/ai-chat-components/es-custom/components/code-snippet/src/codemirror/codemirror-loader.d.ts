type CodeMirrorRuntimeModule = typeof import("./codemirror-runtime.js");
/**
 * Lazily loads the CodeMirror runtime so that heavy editor dependencies are only
 * pulled into the bundle when the code-snippet component is actually rendered.
 */
export declare function loadCodeMirrorRuntime(): Promise<CodeMirrorRuntimeModule>;
/**
 * Public helper so tests or higher-level packages can preload the heavy
 * CodeMirror dependencies ahead of time (e.g., in Jest setup files).
 */
export declare function loadCodeSnippetDeps(): Promise<CodeMirrorRuntimeModule>;
export type { CodeMirrorRuntimeModule };
