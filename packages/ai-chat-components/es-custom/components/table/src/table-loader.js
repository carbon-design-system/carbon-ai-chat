/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
let tableRuntimePromise = null;
function loadTableRuntime() {
    if (!tableRuntimePromise) {
        tableRuntimePromise = import('./table-runtime.js');
    }
    return tableRuntimePromise;
}
function loadTableDeps() {
    return loadTableRuntime();
}

export { loadTableDeps, loadTableRuntime };
//# sourceMappingURL=table-loader.js.map
