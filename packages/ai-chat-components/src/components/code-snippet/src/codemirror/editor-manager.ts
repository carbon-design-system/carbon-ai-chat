/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EditorState, Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { LanguageSupport } from "@codemirror/language";
import { createCarbonTheme } from "./theme.js";
import {
  baseCodeMirrorSetup,
  type BaseCodeMirrorSetupOptions,
} from "./base-setup.js";

interface EditorDocChangePayload {
  content: string;
  lineCount: number;
}

interface EditorCreationOptions {
  container: HTMLElement;
  doc: string;
  languageSupport: LanguageSupport | null;
  languageCompartment: Compartment;
  readOnlyCompartment: Compartment;
  wrapCompartment: Compartment;
  editable: boolean;
  disabled: boolean;
  wrapText: boolean;
  onDocChanged?(payload: EditorDocChangePayload): void;
  setupOptions?: BaseCodeMirrorSetupOptions;
}

const emptyLanguageExtensions: never[] = [];

export function createEditorView({
  container,
  doc,
  languageSupport,
  languageCompartment,
  readOnlyCompartment,
  wrapCompartment,
  editable,
  disabled,
  onDocChanged,
  setupOptions,
}: EditorCreationOptions): EditorView {
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

export function applyLanguageSupport(
  view: EditorView | undefined,
  languageCompartment: Compartment,
  support: LanguageSupport | null,
) {
  if (!view) {
    return;
  }

  const extensions = support ? [support] : emptyLanguageExtensions;
  view.dispatch({
    effects: languageCompartment.reconfigure(extensions),
  });
}

export function updateReadOnlyConfiguration(
  view: EditorView | undefined,
  readOnlyCompartment: Compartment,
  { editable, disabled }: { editable: boolean; disabled: boolean },
) {
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
