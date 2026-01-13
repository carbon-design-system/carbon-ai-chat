type TableRuntimeModule = typeof import("./table-runtime.js");
export declare function loadTableRuntime(): Promise<TableRuntimeModule>;
export declare function loadTableDeps(): Promise<TableRuntimeModule>;
export type { TableRuntimeModule };
