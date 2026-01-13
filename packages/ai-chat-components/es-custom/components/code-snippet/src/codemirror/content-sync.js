/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import throttle from 'lodash-es/throttle.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
function createContentSync({ getEditorView, onAfterApply, throttleMs = 200, }) {
    const throttled = throttle((content) => {
        const view = getEditorView();
        if (!view) {
            return;
        }
        const current = view.state.doc.toString();
        if (content === current) {
            return;
        }
        if (content.startsWith(current)) {
            const appended = content.slice(current.length);
            if (!appended.length) {
                return;
            }
            view.dispatch({
                changes: {
                    from: current.length,
                    to: current.length,
                    insert: appended,
                },
            });
        }
        else if (current.startsWith(content)) {
            view.dispatch({
                changes: {
                    from: content.length,
                    to: current.length,
                    insert: "",
                },
            });
        }
        else {
            view.dispatch({
                changes: {
                    from: 0,
                    to: current.length,
                    insert: content,
                },
            });
        }
        if (onAfterApply) {
            requestAnimationFrame(() => {
                onAfterApply();
            });
        }
    }, throttleMs, { leading: true, trailing: true });
    return {
        update: (content) => throttled(content),
        cancel: () => throttled.cancel(),
    };
}

export { createContentSync };
//# sourceMappingURL=content-sync.js.map
