import { Extension } from "@codemirror/state";
export interface BaseCodeMirrorSetupOptions {
    foldCollapseLabel?: string;
    foldExpandLabel?: string;
}
/**
 * Minimal editor affordances for snippets:
 *  - keep the layout oriented (gutters, folding)
 *  - preserve indentation and basic syntax cues
 *  - avoid heavier behaviors like search, autocomplete, multi-caret history
 */
export declare function baseCodeMirrorSetup(options?: BaseCodeMirrorSetupOptions): Extension;
