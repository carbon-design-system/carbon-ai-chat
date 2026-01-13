import { TemplateResult, LitElement, PropertyValues } from "lit";
export interface TableCellContent {
    text: string;
    template?: TemplateResult | null;
}
export interface TableRowContent {
    cells: TableCellContent[];
}
/**
 * Class functionality for the Table custom element.
 */
declare class CDSAIChatTable extends LitElement {
    /**
     * The optional table title.
     */
    tableTitle?: string;
    /**
     * The optional table description.
     */
    tableDescription?: string;
    /**
     * The array of cells for the header.
     */
    headers: TableCellContent[];
    /**
     * The array of rows. Each row includes an array of cells.
     */
    rows: TableRowContent[];
    /**
     * Whether or not the table content is loading. If it is then a skeleton state should be shown instead.
     */
    loading: boolean;
    /**
     * The text used for the filter placeholder.
     */
    filterPlaceholderText: string;
    /**
     * The text used for the pagination's previous button tooltip.
     */
    previousPageText: string;
    /**
     * The text used for the pagination's next button tooltip.
     */
    nextPageText: string;
    /**
     * The text used for the pagination's item pre page text.
     */
    itemsPerPageText: string;
    /**
     * The text used for the download button's accessible label.
     */
    downloadLabelText: string;
    /**
     * The locale. Used by the carbon table component to change the collator for sorting.
     */
    locale: string;
    get defaultPageSize(): number;
    set defaultPageSize(value: number);
    /**
     * The function used to get the supplemental text for the pagination component.
     */
    getPaginationSupplementalText?: ({ count }: {
        count: number;
    }) => string;
    /**
     * The function used to get the status text for the pagination component.
     */
    getPaginationStatusText?: ({ start, end, count, }: {
        start: number;
        end: number;
        count: number;
    }) => string;
    static styles: any;
    connectedCallback(): void;
    /**
     * Called after the element's DOM has been updated for the first time.
     * Initializes the table page size.
     *
     * @param _changedProperties - Map of properties that changed during the update
     */
    protected firstUpdated(_changedProperties: PropertyValues): Promise<void>;
    /**
     * Updates the CSS custom property `--cds-custom-chat-table-width` based on the parent element's width.
     * Also calculates the default page size on first run based on the measured width.
     * This method is called once during component initialization.
     *
     * @private
     */
    private _updateDefaultPageSize;
    /**
     * Called before the element updates to prepare state changes.
     * Handles validation and re-initialization of table data when headers or rows change.
     *
     * @param changedProperties - Map of properties that changed during the update
     * @protected
     */
    protected willUpdate(changedProperties: PropertyValues<this>): void;
    /**
     * Validates the table structure by checking if all rows have the same number of cells as the header.
     * Sets the internal `_isValid` state to false if any row has a mismatched cell count.
     *
     * A valid table requires:
     * - All rows must have the same number of cells as there are headers
     * - No rows can have more or fewer cells than the column count
     *
     * @private
     */
    private _calcIsTableValid;
    /**
     * Initializes internal arrays used for table functionality.
     * Creates a new array of rows with unique IDs and initializes the filter visibility tracking.
     *
     * This method:
     * 1. Resets the `_rowsWithIDs` array and `_filterVisibleRowIDs` set
     * 2. Assigns string-based IDs to each row for tracking purposes
     * 3. Marks all rows as initially visible (not filtered out)
     *
     * @private
     */
    private _initializeRowsArrays;
    /**
     * Configures the table's page size and filtering behavior.
     * Determines whether filtering/searching should be enabled based on the number of rows
     * relative to the current page size.
     *
     * Filtering is enabled when there are more rows than can fit on a single page,
     * allowing users to search and paginate through large datasets.
     *
     * @private
     */
    private _setPageSize;
    private ensureTableRuntime;
    /**
     * Controls which table rows are visible based on pagination and filtering.
     * Uses CSS display properties to show/hide rows rather than DOM manipulation.
     *
     * This approach is necessary because Carbon's table component handles its own
     * sorting and we need to preserve the DOM order it creates. The method:
     * 1. Hides all rows initially
     * 2. Filters to only rows that haven't been filtered out
     * 3. Shows only the rows that belong to the current page
     *
     * @param page - The page number to display (1-based)
     * @param pageSize - Number of rows per page
     * @private
     */
    private _updateVisibleRows;
    /**
     * Handles the table download functionality by exporting all table data as a CSV file.
     *
     * This custom implementation is necessary because Carbon's default download feature:
     * - Only exports selected rows (we want all data)
     * - Only exports as JSON (we want CSV format)
     * - Doesn't include all the data we need
     *
     * The method dynamically imports the CSV stringify library to avoid bundle bloat,
     * creates a data URL to comply with CSP policies, and triggers a download.
     *
     * @public
     */
    _handleDownload(): Promise<void>;
    /**
     * Renders the table component based on current state and data.
     *
     * The render logic follows this priority:
     * 1. Shows skeleton loading state if `loading` is true
     * 2. Shows table with pagination if there are more rows than the page size OR pagination was used
     * 3. Shows table only if all rows fit on one page
     *
     * The method also applies the appropriate Carbon theme class (cds-custom--g90 for dark, cds-custom--white for light)
     * to ensure proper styling based on the `dark` property.
     *
     * @returns The lit-html template for the table component
     * @public
     */
    render(): TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-table": CDSAIChatTable;
    }
}
export { CDSAIChatTable };
export default CDSAIChatTable;
