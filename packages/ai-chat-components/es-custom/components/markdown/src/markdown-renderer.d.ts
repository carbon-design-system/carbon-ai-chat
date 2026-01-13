import { TemplateResult } from "lit";
import "@carbon/web-components/es-custom/components/list/index.js";
import "@carbon/web-components/es-custom/components/checkbox/index.js";
import "../../code-snippet/index.js";
import "../../table/index.js";
import type { TokenTree } from "./markdown-token-tree.js";
/**
 * Configuration options for rendering TokenTrees into HTML.
 */
export interface RenderTokenTreeOptions {
    /** Whether to sanitize HTML content using DOMPurify */
    sanitize: boolean;
    /** Whether content is being streamed (affects loading states) */
    streaming?: boolean;
    /** Context information for nested rendering */
    context?: {
        /** Whether we're currently inside a table header */
        isInThead?: boolean;
        /** All children of the parent node */
        parentChildren?: TokenTree[];
        /** Current index in parent's children array */
        currentIndex?: number;
    };
    /** Whether to enable syntax highlighting in code blocks */
    highlight?: boolean;
    /** Placeholder text for table filter input */
    filterPlaceholderText?: string;
    /** Text for previous page button tooltip */
    previousPageText?: string;
    /** Text for next page button tooltip */
    nextPageText?: string;
    /** Text for items per page label */
    itemsPerPageText?: string;
    /**
     * The text used for the download button's accessible label.
     */
    downloadLabelText?: string;
    /** Locale for table sorting and formatting */
    locale?: string;
    /** Function to get supplemental pagination text */
    getPaginationSupplementalText?: ({ count }: {
        count: number;
    }) => string;
    /** Function to get pagination status text */
    getPaginationStatusText?: ({ start, end, count, }: {
        start: number;
        end: number;
        count: number;
    }) => string;
    /** Feedback text shown after copying */
    feedback?: string;
    /** Text for show less button */
    showLessText?: string;
    /** Text for show more button */
    showMoreText?: string;
    /** Tooltip text for copy button */
    tooltipContent?: string;
    /** Function to get formatted line count text */
    getLineCountText?: ({ count }: {
        count: number;
    }) => string;
}
/**
 * Converts TokenTree to Lit TemplateResult.
 */
export declare function renderTokenTree(node: TokenTree, options: RenderTokenTreeOptions): TemplateResult;
