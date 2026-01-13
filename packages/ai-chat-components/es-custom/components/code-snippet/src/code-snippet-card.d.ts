import { LitElement } from "lit";
import "../../card/index.js";
import "./code-snippet.js";
import { type LineCountFormatter } from "./formatters.js";
/**
 * AI Chat code snippet wrapper that places the snippet inside a Carbon tile.
 *
 * @element cds-aichat-code-snippet-card
 */
declare class CDSAIChatCodeSnippetCard extends LitElement {
    /** Language used for syntax highlighting. */
    language: string;
    /** Whether the snippet should be editable. */
    editable: boolean;
    /** Whether to enable syntax highlighting. */
    highlight: boolean;
    /** Fallback language to use when detection fails. */
    defaultLanguage: string;
    /** Text to copy when clicking the copy button. Defaults to slotted content. */
    copyText: string;
    /** Disable interactions on the snippet. */
    disabled: boolean;
    /** Feedback text shown after copy. */
    feedback: string;
    /** Duration (ms) to show feedback text. */
    feedbackTimeout: number;
    /** Hide the copy button. */
    hideCopyButton: boolean;
    /** Maximum rows to show when collapsed. */
    maxCollapsedNumberOfRows: number;
    /** Maximum rows to show when expanded (0 = unlimited). */
    maxExpandedNumberOfRows: number;
    /** Minimum rows to show when collapsed. */
    minCollapsedNumberOfRows: number;
    /** Minimum rows to show when expanded. */
    minExpandedNumberOfRows: number;
    /** Label for the “show less” control. */
    showLessText: string;
    /** Label for the “show more” control. */
    showMoreText: string;
    /** Tooltip label for the copy action. */
    tooltipContent: string;
    /** Wrap text instead of horizontal scrolling. */
    wrapText: boolean;
    /** Label for folding/collapsing code. */
    foldCollapseLabel: string;
    /** Label for unfolding/expanding code. */
    foldExpandLabel: string;
    /** Formatter for the line count display. */
    getLineCountText: LineCountFormatter;
    /**
     * Handles the content-change event from the inner code snippet and re-dispatches it.
     */
    private _handleContentChange;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-code-snippet-card": CDSAIChatCodeSnippetCard;
    }
}
export { CDSAIChatCodeSnippetCard };
export default CDSAIChatCodeSnippetCard;
