/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { __decorate } from 'tslib';
import { LitElement, html } from 'lit';
import { property, state } from 'lit/decorators.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import { tableSkeletonTemplate } from './table-skeleton.template.js';
import { loadTableRuntime } from './table-loader.js';
import styles from './table.scss.js';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
// Width threshold for determining default page size. Tables wider than this get 10 rows, narrower get 5 rows.
const PAGE_SIZE_WIDTH_THRESHOLD = 400;
/**
 * Class functionality for the Table custom element.
 */
let CDSAIChatTable = class CDSAIChatTable extends LitElement {
    constructor() {
        super(...arguments);
        /**
         * The array of cells for the header.
         */
        this.headers = [];
        /**
         * The array of rows. Each row includes an array of cells.
         */
        this.rows = [];
        /**
         * Whether or not the table content is loading. If it is then a skeleton state should be shown instead.
         */
        this.loading = false;
        /**
         * The text used for the filter placeholder.
         */
        this.filterPlaceholderText = "Filter table...";
        /**
         * The text used for the pagination's previous button tooltip.
         */
        this.previousPageText = "Previous page";
        /**
         * The text used for the pagination's next button tooltip.
         */
        this.nextPageText = "Next page";
        /**
         * The text used for the pagination's item pre page text.
         */
        this.itemsPerPageText = "Items per page:";
        /**
         * The text used for the download button's accessible label.
         */
        this.downloadLabelText = "Download table data";
        /**
         * The locale. Used by the carbon table component to change the collator for sorting.
         */
        this.locale = "en";
        /**
         * The calculated default page size based on component width.
         * 10 for width > PAGE_SIZE_WIDTH_THRESHOLD, 5 for width <= PAGE_SIZE_WIDTH_THRESHOLD.
         *
         * @internal
         */
        this._defaultPageSize = 5;
        /**
         * If the table is valid or not.
         *
         * @internal
         */
        this._isValid = true;
        /**
         * The current page of the table we're on.
         *
         * @internal
         */
        this._currentPageNumber = 1;
        /**
         * How many rows are on each page of the table.
         *
         * @internal
         */
        this._currentPageSize = this.defaultPageSize;
        /**
         * Whether or not the number of rows per page was changed with the pagination component. If the user used the
         * pagination controls to show all rows, the pagination component would normally hide itself because the number of is
         * no longer greater than the page size. However the pagination component needs to persist in this case, since the
         * user may want to change the page size again. This is used to keep track of whether the pagination controls were
         * used to change page size, and if they have, it forces pagination component to persist.
         *
         * @internal
         */
        this._rowsPerPageChanged = false;
        /**
         * The rows that have not been filtered out.
         *
         * @internal
         */
        this._filterVisibleRowIDs = new Set();
        /**
         * All of the rows for the table with IDs.
         *
         * @internal
         */
        this._rowsWithIDs = [];
        /**
         * Whether or not the table should be able to be filtered.
         *
         * @internal
         */
        this._allowFiltering = false;
        /**
         * @internal
         */
        this.tableRuntime = null;
        /**
         * @internal
         */
        this.tableRuntimePromise = null;
        /**
         * Handles pagination events from the Carbon pagination component.
         * Updates the visible rows when the user navigates to a different page.
         *
         * Note: This event sometimes fires twice due to a Carbon framework quirk,
         * but since the page/size values are identical, it doesn't affect functionality.
         *
         * @param event - The page change event containing the new page number and size
         * @public
         *
         * @internal
         */
        this._handlePageChangeEvent = (event) => {
            this._updateVisibleRows(event.detail?.page, event.detail?.pageSize);
            event.stopPropagation();
        };
        /**
         * Handles page size change events from the pagination component.
         * Updates the current page size and recalculates visible rows.
         * Marks that the page size has been manually changed by the user.
         *
         * @param event - The page size change event containing the new page size
         * @public
         *
         * @internal
         */
        this._handlePageSizeChangeEvent = (event) => {
            this._rowsPerPageChanged = true;
            this._currentPageSize = event.detail?.pageSize;
            this._updateVisibleRows();
            event.stopPropagation();
        };
        /**
         * Handles filter and sort events from the Carbon table component.
         * Updates the set of visible rows based on filtering/sorting results and resets to the first page.
         *
         * This event is triggered by:
         * - Column sorting (clicking on sortable column headers)
         * - Table filtering (using the search bar)
         *
         * @param event - The filter event containing the array of unfiltered rows
         * @public
         *
         * @internal
         */
        this._handleFilterEvent = (event) => {
            // Record the new set of unfiltered row ids.
            this._filterVisibleRowIDs = new Set(event?.detail?.unfilteredRows.map((row) => row.id));
            // Go back to the first page.
            this._currentPageNumber = 1;
            // Update which rows are visible.
            this._updateVisibleRows();
            event.stopPropagation();
        };
    }
    get defaultPageSize() {
        return this._defaultPageSize;
    }
    set defaultPageSize(value) {
        this._defaultPageSize = value;
    }
    connectedCallback() {
        super.connectedCallback();
        void this.ensureTableRuntime();
    }
    /**
     * Called after the element's DOM has been updated for the first time.
     * Initializes the table page size.
     *
     * @param _changedProperties - Map of properties that changed during the update
     */
    async firstUpdated(_changedProperties) {
        await this.updateComplete;
        this._updateDefaultPageSize();
        this._setPageSize();
    }
    /**
     * Updates the CSS custom property `--cds-custom-chat-table-width` based on the parent element's width.
     * Also calculates the default page size on first run based on the measured width.
     * This method is called once during component initialization.
     *
     * @private
     */
    _updateDefaultPageSize() {
        if (this.parentElement) {
            let parentWidth = this.parentElement.offsetWidth;
            // If parent width is 0, use fallback width that ensures 5-row default page size
            if (parentWidth === 0) {
                parentWidth = PAGE_SIZE_WIDTH_THRESHOLD - 1;
            }
            // Calculate default page size based on the width we just measured
            // Only set it once, don't recalculate on resize
            if (parentWidth > 0 && this._defaultPageSize === 5) {
                this._defaultPageSize =
                    parentWidth > PAGE_SIZE_WIDTH_THRESHOLD ? 10 : 5;
                // Update _currentPageSize if it's still at the initial value
                if (this._currentPageSize === 5) {
                    this._currentPageSize = this._defaultPageSize;
                }
            }
        }
    }
    /**
     * Called before the element updates to prepare state changes.
     * Handles validation and re-initialization of table data when headers or rows change.
     *
     * @param changedProperties - Map of properties that changed during the update
     * @protected
     */
    willUpdate(changedProperties) {
        // If the headers or rows has recently updated and both are defined than we should validate the table
        // data. This will likely only happen on the web components first render cycle when the props go from undefined to
        // defined.
        if ((changedProperties.has("headers") || changedProperties.has("rows")) &&
            this.headers !== undefined &&
            this.rows !== undefined) {
            this._calcIsTableValid();
        }
        // If the value of tableRows updated then initialize the internal rows arrays.
        if (changedProperties.has("rows") && this.rows !== undefined) {
            this._initializeRowsArrays();
            this._setPageSize();
        }
    }
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
    _calcIsTableValid() {
        const columnCount = this.headers.length;
        // If one of the rows has a different number of cells than the number of columns in the header then set our internal
        // valid state to false.
        this._isValid = !this.rows.some((row) => row.cells.length !== columnCount);
        // In the future, once we have an inlineError web component to use, we can render that when our table is not valid
        // (as well as throwing the below error). Until then our React container is rendering the error component and
        // throwing the error.
        // throw new Error(
        //   `${WA_CONSOLE_PREFIX} Number of cells in the table header does not match the number of cells in one or more of the table rows. In order to render a table there needs to be the same number of columns in the table header and all of the table rows.`,
        // );
    }
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
    _initializeRowsArrays() {
        // Reset both arrays.
        this._rowsWithIDs = [];
        this._filterVisibleRowIDs = new Set();
        this.rows.forEach((row, index) => {
            const id = index.toString();
            this._rowsWithIDs.push({ ...row, id });
            this._filterVisibleRowIDs.add(id);
        });
    }
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
    _setPageSize() {
        // If there are more rows than the page size then enable filtering.
        this._allowFiltering = this.rows.length > this._currentPageSize;
        // Update the visible rows in case the page size has changed or this is the first time this web component has
        // rendered.
        this._updateVisibleRows();
    }
    async ensureTableRuntime() {
        if (this.tableRuntime) {
            return this.tableRuntime;
        }
        if (typeof window === "undefined") {
            return null;
        }
        if (!this.tableRuntimePromise) {
            this.tableRuntimePromise = loadTableRuntime();
        }
        try {
            const runtime = await this.tableRuntimePromise;
            this.tableRuntime = runtime;
            this.requestUpdate();
            return runtime;
        }
        catch (error) {
            console.error("Failed to load table runtime", error);
            this.tableRuntimePromise = null;
            return null;
        }
    }
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
    _updateVisibleRows(page = this._currentPageNumber, pageSize = this._currentPageSize) {
        // Set the current page number and only show the rows for that page.
        this._currentPageNumber = page;
        // Grab all the rows that have been rendered. It's necessary to grab them from the page because the cds-custom-table puts
        // the rows in a specific order when sorting and we want to preserve that order.
        const rows = Array.from(this.renderRoot.querySelectorAll("cds-custom-table-row"));
        // This is similar to the carbon example here https://stackblitz.com/edit/github-kbd9xw-s3y3s6?file=index.html. I
        // originally tried creating and passing an array of the specific rows the template should render for the current
        // page. Unfortunately doing that doesn't work with the combination of the is-sortable prop for the table and
        // page-size prop for pagination. What would happen is old rows would persist if you were on the last page and there
        // weren't enough rows to fill the page (even though the old rows weren't included in the new rows provided to the
        // template). Using Carbon's example of hiding the rows with styling works so I'm extending that concept here even
        // though, ideally, render controls the view and reacts to the state that would be determined here.
        // Hide all the rows to start.
        rows.forEach((row) => row.style.setProperty("display", "none"));
        // Now filter the rows down to what is visible according to the filter.
        const filterVisibleRows = rows.filter((row) => this._filterVisibleRowIDs.has(row.id));
        // Now show all the rows that are within the current page.
        const pageStart = (page - 1) * pageSize;
        const pageEnd = page * pageSize - 1;
        for (let index = pageStart; index <= pageEnd; index++) {
            // If there is a row at that index then show it. If there aren't enough rows to fill the page then there won't be
            // a row at that index.
            filterVisibleRows[index]?.removeAttribute("style");
        }
    }
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
    async _handleDownload() {
        // Don't save content from the expandable rows at this time. This could be added in the future but it's unclear how
        // this would look in the download.
        const tableArray = [
            this.headers.map((cell) => cell.text),
            ...this.rows.map((row) => row.cells.map((cell) => cell.text)),
        ];
        try {
            // Lazy load the CSV stringify function only when needed
            const { stringify } = await import('csv-stringify/browser/esm/sync');
            // Convert table data to CSV format
            const csvContent = stringify(tableArray);
            // Use data URL instead of Blob to avoid CSP issues with object-src
            const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(csvContent)}`;
            // Create and trigger download using anchor element
            const link = document.createElement("a");
            link.setAttribute("href", dataUrl);
            link.setAttribute("download", "table-data.csv");
            link.style.visibility = "hidden";
            document.body.appendChild(link);
            // Trigger download and cleanup
            link.click();
            document.body.removeChild(link);
        }
        catch (error) {
            console.error("Failed to download table data:", error);
            // Fallback: could show user notification or use alternative method
        }
    }
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
    render() {
        // TODO TABLE: Once we have a web component version of the inline error state we could render that here if
        // !this._isValid.
        // This could be used while we wait for a md stream containing a table to complete.
        const runtime = this.tableRuntime;
        if (this.loading || !runtime) {
            if (!runtime) {
                void this.ensureTableRuntime();
            }
            return tableSkeletonTemplate(this._currentPageSize);
        }
        const { tableTemplate, tablePaginationTemplate } = runtime;
        // If there are more rows than the page size then we need to add the pagination component. If the rows per page has
        // been changed by the pagination component then we need to keep the pagination component around so the user can
        // change the page size again, even if the current page size is the same as the number of table rows.
        if (this.rows.length > this._currentPageSize || this._rowsPerPageChanged) {
            return html `<div class="cds-custom-ai-chat-table-container">
        ${tableTemplate(this)}
        ${tablePaginationTemplate({
                _currentPageSize: this._currentPageSize,
                _currentPageNumber: this._currentPageNumber,
                _filterVisibleRowIDs: this._filterVisibleRowIDs,
                rows: this.rows,
                previousPageText: this.previousPageText,
                nextPageText: this.nextPageText,
                itemsPerPageText: this.itemsPerPageText,
                getPaginationSupplementalText: this.getPaginationSupplementalText,
                getPaginationStatusText: this.getPaginationStatusText,
                _handlePageChangeEvent: this._handlePageChangeEvent,
                _handlePageSizeChangeEvent: this._handlePageSizeChangeEvent,
            })}
      </div>`;
        }
        // Otherwise, just render the table.
        return html `<div class="cds-custom-ai-chat-table-container">
      ${tableTemplate(this)}
    </div>`;
    }
};
CDSAIChatTable.styles = styles;
__decorate([
    property({ type: String, attribute: "table-title" })
], CDSAIChatTable.prototype, "tableTitle", void 0);
__decorate([
    property({ type: String, attribute: "table-description" })
], CDSAIChatTable.prototype, "tableDescription", void 0);
__decorate([
    property({ type: Array, attribute: false })
], CDSAIChatTable.prototype, "headers", void 0);
__decorate([
    property({ type: Array, attribute: false })
], CDSAIChatTable.prototype, "rows", void 0);
__decorate([
    property({ type: Boolean, attribute: "loading" })
], CDSAIChatTable.prototype, "loading", void 0);
__decorate([
    property({ type: String, attribute: "filter-placeholder-text" })
], CDSAIChatTable.prototype, "filterPlaceholderText", void 0);
__decorate([
    property({ type: String, attribute: "previous-page-text" })
], CDSAIChatTable.prototype, "previousPageText", void 0);
__decorate([
    property({ type: String, attribute: "next-page-text" })
], CDSAIChatTable.prototype, "nextPageText", void 0);
__decorate([
    property({ type: String, attribute: "items-per-page-text" })
], CDSAIChatTable.prototype, "itemsPerPageText", void 0);
__decorate([
    property({ type: String, attribute: "download-label-text" })
], CDSAIChatTable.prototype, "downloadLabelText", void 0);
__decorate([
    property({ type: String, attribute: "locale" })
], CDSAIChatTable.prototype, "locale", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_defaultPageSize", void 0);
__decorate([
    property({ type: Number, attribute: "default-page-size" })
], CDSAIChatTable.prototype, "defaultPageSize", null);
__decorate([
    property({ type: Function, attribute: false })
], CDSAIChatTable.prototype, "getPaginationSupplementalText", void 0);
__decorate([
    property({ type: Function, attribute: false })
], CDSAIChatTable.prototype, "getPaginationStatusText", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_isValid", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_currentPageNumber", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_currentPageSize", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_rowsPerPageChanged", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_filterVisibleRowIDs", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_rowsWithIDs", void 0);
__decorate([
    state()
], CDSAIChatTable.prototype, "_allowFiltering", void 0);
CDSAIChatTable = __decorate([
    carbonElement("cds-aichat-table")
], CDSAIChatTable);
var CDSAIChatTable_default = CDSAIChatTable;

export { CDSAIChatTable, CDSAIChatTable_default as default };
//# sourceMappingURL=table.js.map
