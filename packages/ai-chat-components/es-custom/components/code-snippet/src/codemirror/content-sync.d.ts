import { EditorView } from "@codemirror/view";
interface ContentSyncHooks {
    getEditorView(): EditorView | undefined;
    onAfterApply?(): void;
    throttleMs?: number;
}
export interface ContentSyncHandle {
    update(content: string): void;
    cancel(): void;
}
export declare function createContentSync({ getEditorView, onAfterApply, throttleMs, }: ContentSyncHooks): ContentSyncHandle;
export {};
