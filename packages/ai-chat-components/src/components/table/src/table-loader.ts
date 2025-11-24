/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

type TableRuntimeModule = typeof import("./table-runtime.js");

let tableRuntimePromise: Promise<TableRuntimeModule> | null = null;

export function loadTableRuntime(): Promise<TableRuntimeModule> {
  if (!tableRuntimePromise) {
    tableRuntimePromise = import("./table-runtime.js");
  }
  return tableRuntimePromise;
}

export function loadTableDeps(): Promise<TableRuntimeModule> {
  return loadTableRuntime();
}

export type { TableRuntimeModule };
