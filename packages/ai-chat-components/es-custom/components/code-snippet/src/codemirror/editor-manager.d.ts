import { Compartment } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { LanguageSupport } from "@codemirror/language";
import { type BaseCodeMirrorSetupOptions } from "./base-setup.js";
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
export declare function createEditorView({ container, doc, languageSupport, languageCompartment, readOnlyCompartment, wrapCompartment, editable, disabled, onDocChanged, setupOptions, }: EditorCreationOptions): EditorView;
export declare function applyLanguageSupport(view: EditorView | undefined, languageCompartment: Compartment, support: LanguageSupport | null): void;
export declare function updateReadOnlyConfiguration(view: EditorView | undefined, readOnlyCompartment: Compartment, { editable, disabled }: {
    editable: boolean;
    disabled: boolean;
}): void;
export {};
