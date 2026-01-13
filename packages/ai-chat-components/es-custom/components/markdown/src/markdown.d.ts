import { LitElement, PropertyValues, TemplateResult } from "lit";
declare class CDSAIChatMarkdown extends LitElement {
    static styles: any;
    /**
     * Sanitize any HTML included in the markdown. e.g. remove script tags, onclick handlers, etc.
     */
    sanitizeHTML: boolean;
    /**
     * Remove all HTML from included markdown.
     */
    removeHTML: boolean;
    /**
     * If you are actively streaming, setting this to true can help prevent needless UI thrashing when writing
     * complex components (like a sortable and filterable table).
     */
    streaming: boolean;
    /**
     * Enable syntax highlighting for any code fence blocks.
     */
    highlight: boolean;
    /** Placeholder text for table filters. */
    filterPlaceholderText: string;
    /** Label for the previous page control in tables. */
    previousPageText: string;
    /** Label for the next page control in tables. */
    nextPageText: string;
    /** Label for the items-per-page control in tables. */
    itemsPerPageText: string;
    /** Label for download of CSV of table data. */
    downloadLabelText: string;
    /** Locale used for table pagination and formatting. */
    locale: string;
    /** Optional formatter for supplemental pagination text. */
    getPaginationSupplementalText?: ({ count }: {
        count: number;
    }) => string;
    /** Optional formatter for pagination status text. */
    getPaginationStatusText?: ({ start, end, count, }: {
        start: number;
        end: number;
        count: number;
    }) => string;
    /** Feedback text shown after copying code blocks. */
    feedback: string;
    /** Label for collapsing long code blocks. */
    showLessText: string;
    /** Label for expanding long code blocks. */
    showMoreText: string;
    /** Tooltip content for the copy action on code blocks. */
    tooltipContent: string;
    /** Formatter for the code block line count. */
    getLineCountText?: ({ count }: {
        count: number;
    }) => string;
    connectedCallback(): void;
    disconnectedCallback(): void;
    protected willUpdate(changed: PropertyValues<this>): void;
    /**
     * Reads slotted text content and uses it as the markdown source when provided.
     */
    private _syncMarkdownFromLightDom;
    protected firstUpdated(): void;
    protected getUpdateComplete(): Promise<boolean>;
    protected render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-markdown": CDSAIChatMarkdown;
    }
}
export { CDSAIChatMarkdown };
export default CDSAIChatMarkdown;
