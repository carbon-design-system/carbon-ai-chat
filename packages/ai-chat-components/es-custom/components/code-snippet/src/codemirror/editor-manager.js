/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { EditorState } from '@codemirror/state';
import { EditorView } from '@codemirror/view';
import { createCarbonTheme } from './theme.js';
import { baseCodeMirrorSetup } from './base-setup.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const emptyLanguageExtensions = [];
function createEditorView({ container, doc, languageSupport, languageCompartment, readOnlyCompartment, wrapCompartment, editable, disabled, onDocChanged, setupOptions, }) {
    const languageExtensions = languageSupport
        ? [languageSupport]
        : emptyLanguageExtensions;
    const readOnlyExtensions = [
        EditorState.readOnly.of(!editable || disabled),
        EditorView.editable.of(editable && !disabled),
    ];
    const wrapTheme = createCarbonTheme();
    const state = EditorState.create({
        doc,
        extensions: [
            baseCodeMirrorSetup(setupOptions),
            languageCompartment.of(languageExtensions),
            readOnlyCompartment.of(readOnlyExtensions),
            wrapCompartment.of(wrapTheme),
            EditorView.updateListener.of((update) => {
                if (update.docChanged && onDocChanged) {
                    onDocChanged({
                        content: update.state.doc.toString(),
                        lineCount: update.state.doc.lines,
                    });
                }
            }),
        ],
    });
    return new EditorView({
        state,
        parent: container,
    });
}
function applyLanguageSupport(view, languageCompartment, support) {
    if (!view) {
        return;
    }
    const extensions = support ? [support] : emptyLanguageExtensions;
    view.dispatch({
        effects: languageCompartment.reconfigure(extensions),
    });
}
function updateReadOnlyConfiguration(view, readOnlyCompartment, { editable, disabled }) {
    if (!view) {
        return;
    }
    view.dispatch({
        effects: readOnlyCompartment.reconfigure([
            EditorState.readOnly.of(!editable || disabled),
            EditorView.editable.of(editable && !disabled),
        ]),
    });
}

export { applyLanguageSupport, createEditorView, updateReadOnlyConfiguration };
//# sourceMappingURL=editor-manager.js.map
