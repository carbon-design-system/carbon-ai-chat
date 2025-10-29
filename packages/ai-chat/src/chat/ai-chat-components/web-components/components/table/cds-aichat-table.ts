/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { type CDSTableRow } from "@carbon/web-components";
import { css, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import type { TemplateResult } from "lit";
import { property, state } from "lit/decorators.js";
import debounce from "lodash-es/debounce.js";

import { carbonElement } from "@carbon/ai-chat-components/es/globals/decorators/index.js";
import styles from "./src/table.scss";
import { tableTemplate } from "./src/table.template";
import { tablePaginationTemplate } from "./src/tablePagination.template";
import { tableSkeletonTemplate } from "./src/tableSkeleton.template";
export interface TableCellContent {
  text: string;
  template?: TemplateResult | null;
}

export interface TableRowContent {
  cells: TableCellContent[];
}

interface PageChangeEvent extends Event {
  detail: {
    page: number;
    pageSize: number;
  };
}

interface FilterEvent extends Event {
  detail: {
    unfilteredRows: CDSTableRow[];
  };
}

interface TableRowWithIDs extends TableRowContent {
  id: string;
}

// Width threshold for determining default page size. Tables wider than this get 10 rows, narrower get 5 rows.
const PAGE_SIZE_WIDTH_THRESHOLD = 400;

// We will have to give this component a unique ID on the name when we register it to avoid conflicts in a world where
// multiple versions of the Carbon AI Chat can be on the same page.
const TABLE_COMPONENT_TAG_NAME = "cds-aichat-table";

/**
 * Class functionality for the Table custom element.
 */
@carbonElement(TABLE_COMPONENT_TAG_NAME)
class TableElement extends LitElement {
  /**
   * The optional table title.
   */
  @property({ type: String, attribute: "table-title" })
  tableTitle?: string;

  /**
   * The optional table description.
   */
  @property({ type: String, attribute: "table-description" })
  tableDescription?: string;

  /**
   * The array of cells for the header.
   */
  @property({ type: Array, attribute: false })
  headers: TableCellContent[] = [];

  /**
   * The array of rows. Each row includes an array of cells.
   */
  @property({ type: Array, attribute: false })
  rows: TableRowContent[] = [];

  /**
   * Whether or not the table content is loading. If it is then a skeleton state should be shown instead.
   */
  @property({ type: Boolean, attribute: "loading" })
  loading: boolean;

  /**
   * The text used for the filter placeholder.
   */
  @property({ type: String, attribute: "filter-placeholder-text" })
  filterPlaceholderText: string;

  /**
   * The text used for the pagination's previous button tooltip.
   */
  @property({ type: String, attribute: "previous-page-text" })
  previousPageText: string;

  /**
   * The text used for the pagination's next button tooltip.
   */
  @property({ type: String, attribute: "next-page-text" })
  nextPageText: string;

  /**
   * The text used for the pagination's item pre page text.
   */
  @property({ type: String, attribute: "items-per-page-text" })
  itemsPerPageText: string;

  /**
   * The locale. Used by the carbon table component to change the collator for sorting.
   */
  @property({ type: String, attribute: "locale" })
  locale: string;

  /**
   * The calculated default page size based on component width.
   * 10 for width > PAGE_SIZE_WIDTH_THRESHOLD, 5 for width <= PAGE_SIZE_WIDTH_THRESHOLD.
   */
  @state()
  private _defaultPageSize = 5;

  @property({ type: Number, attribute: "default-page-size" })
  get defaultPageSize(): number {
    return this._defaultPageSize;
  }

  set defaultPageSize(value: number) {
    this._defaultPageSize = value;
  }

  /**
   * The function used to get the supplemental text for the pagination component.
   */
  @property({ type: Function, attribute: false })
  getPaginationSupplementalText: ({ count }: { count: number }) => string;

  /**
   * The function used to get the status text for the pagination component.
   */
  @property({ type: Function, attribute: false })
  getPaginationStatusText: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;

  /**
   * If the table is valid or not.
   */
  @state()
  protected _isValid = true;

  /**
   * The current page of the table we're on.
   */
  @state()
  public _currentPageNumber = 1;

  /**
   * How many rows are on each page of the table.
   */
  @state()
  public _currentPageSize: number = this.defaultPageSize;

  /**
   * Whether or not the number of rows per page was changed with the pagination component. If the user used the
   * pagination controls to show all rows, the pagination component would normally hide itself because the number of is
   * no longer greater than the page size. However the pagination component needs to persist in this case, since the
   * user may want to change the page size again. This is used to keep track of whether the pagination controls were
   * used to change page size, and if they have, it forces pagination component to persist.
   */
  @state()
  public _rowsPerPageChanged = false;

  /**
   * The rows that have not been filtered out.
   */
  @state()
  public _filterVisibleRowIDs: Set<string>;

  /**
   * All of the rows for the table with IDs.
   */
  @state()
  public _rowsWithIDs: TableRowWithIDs[] = [];

  /**
   * Whether or not the table should be able to be filtered.
   */
  @state()
  public _allowFiltering: boolean;

  static styles = css`
    ${unsafeCSS(styles)}
  `;

  private _parentResizeObserver?: ResizeObserver;

  /**
   * Called when the element is added to the DOM.
   * Sets up the ResizeObserver to monitor parent element width changes.
   */
  connectedCallback() {
    super.connectedCallback();
    this._setupParentResizeObserver();
  }

  /**
   * Called when the element is removed from the DOM.
   * Cleans up the ResizeObserver to prevent memory leaks.
   */
  disconnectedCallback() {
    super.disconnectedCallback();
    this._cleanupParentResizeObserver();
  }

  /**
   * Called after the element's DOM has been updated for the first time.
   * Initializes the table page size and sets up width-based calculations.
   *
   * @param _changedProperties - Map of properties that changed during the update
   */
  protected firstUpdated(_changedProperties: PropertyValues): void {
    this._setPageSize();
    this._updateParentWidthCSSProperty(); // Initial width setting
  }

  /**
   * Sets up a ResizeObserver to monitor the parent element's width changes.
   * Updates the CSS custom property `--cds-chat-table-width` when the parent resizes.
   * Uses debouncing to limit the frequency of updates to improve performance.
   *
   * @private
   */
  private _setupParentResizeObserver() {
    if (typeof ResizeObserver !== "undefined" && this.parentElement) {
      this._parentResizeObserver = new ResizeObserver(
        debounce((entries) => {
          for (const entry of entries) {
            // Use the element's offsetWidth instead of contentRect.width for custom elements
            const elementWidth = (entry.target as HTMLElement).offsetWidth;

            if (elementWidth > 0) {
              this.style.setProperty(
                "--cds-aichat-table-width",
                `${elementWidth}px`,
              );
            }
          }
        }, 100), // 100ms debounce for parent resize events
      );
      this._parentResizeObserver.observe(this.parentElement);
    }
  }

  /**
   * Cleans up the ResizeObserver to prevent memory leaks.
   * Should be called when the component is disconnected from the DOM.
   *
   * @private
   */
  private _cleanupParentResizeObserver() {
    if (this._parentResizeObserver) {
      this._parentResizeObserver.disconnect();
      this._parentResizeObserver = undefined;
    }
  }

  /**
   * Updates the CSS custom property `--cds-chat-table-width` based on the parent element's width.
   * Also calculates the default page size on first run based on the measured width.
   * This method is called once during component initialization.
   *
   * @private
   */
  private _updateParentWidthCSSProperty() {
    if (this.parentElement) {
      let parentWidth = this.parentElement.offsetWidth;

      // If parent width is 0, use fallback width that ensures 5-row default page size
      if (parentWidth === 0) {
        parentWidth = PAGE_SIZE_WIDTH_THRESHOLD - 1;
      }

      if (parentWidth > 0) {
        this.style.setProperty("--cds-aichat-table-width", `${parentWidth}px`);

        // Calculate default page size based on the width we just measured
        // Only set it once, don't recalculate on resize
        if (this._defaultPageSize === 5) {
          this._defaultPageSize =
            parentWidth > PAGE_SIZE_WIDTH_THRESHOLD ? 10 : 5;

          // Update _currentPageSize if it's still at the initial value
          if (this._currentPageSize === 5) {
            this._currentPageSize = this._defaultPageSize;
          }
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
  protected willUpdate(changedProperties: PropertyValues<this>) {
    // If the headers or rows has recently updated and both are defined than we should validate the table
    // data. This will likely only happen on the web components first render cycle when the props go from undefined to
    // defined.
    if (
      (changedProperties.has("headers") || changedProperties.has("rows")) &&
      this.headers !== undefined &&
      this.rows !== undefined
    ) {
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
  private _calcIsTableValid() {
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
  private _initializeRowsArrays() {
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
  private _setPageSize() {
    // If there are more rows than the page size then enable filtering.
    this._allowFiltering = this.rows.length > this._currentPageSize;

    // Update the visible rows in case the page size has changed or this is the first time this web component has
    // rendered.
    this._updateVisibleRows();
  }

  /**
   * Handles pagination events from the Carbon pagination component.
   * Updates the visible rows when the user navigates to a different page.
   *
   * Note: This event sometimes fires twice due to a Carbon framework quirk,
   * but since the page/size values are identical, it doesn't affect functionality.
   *
   * @param event - The page change event containing the new page number and size
   * @public
   */
  public _handlePageChangeEvent = (event: PageChangeEvent) => {
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
   */
  public _handlePageSizeChangeEvent = (event: PageChangeEvent) => {
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
   */
  public _handleFilterEvent = (event: FilterEvent) => {
    // Record the new set of unfiltered row ids.
    this._filterVisibleRowIDs = new Set(
      event?.detail?.unfilteredRows.map((row) => row.id),
    );

    // Go back to the first page.
    this._currentPageNumber = 1;

    // Update which rows are visible.
    this._updateVisibleRows();
    event.stopPropagation();
  };

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
  private _updateVisibleRows(
    page: number = this._currentPageNumber,
    pageSize: number = this._currentPageSize,
  ) {
    // Set the current page number and only show the rows for that page.
    this._currentPageNumber = page;

    // Grab all the rows that have been rendered. It's necessary to grab them from the page because the cds-table puts
    // the rows in a specific order when sorting and we want to preserve that order.
    const rows: HTMLElement[] = Array.from(
      this.renderRoot.querySelectorAll("cds-table-row"),
    );

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
    const filterVisibleRows = rows.filter((row) =>
      this._filterVisibleRowIDs.has(row.id),
    );

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
  public async _handleDownload() {
    // Don't save content from the expandable rows at this time. This could be added in the future but it's unclear how
    // this would look in the download.
    const tableArray: (string | number)[][] = [
      this.headers.map((cell) => cell.text),
      ...this.rows.map((row) => row.cells.map((cell) => cell.text)),
    ];

    try {
      // Lazy load the CSV stringify function only when needed
      const { stringify } = await import("csv-stringify/browser/esm/sync");

      // Convert table data to CSV format
      const csvContent = stringify(tableArray);

      // Use data URL instead of Blob to avoid CSP issues with object-src
      const dataUrl = `data:text/csv;charset=utf-8,${encodeURIComponent(
        csvContent,
      )}`;

      // Create and trigger download using anchor element
      const link = document.createElement("a");
      link.setAttribute("href", dataUrl);
      link.setAttribute("download", "table-data.csv");
      link.style.visibility = "hidden";
      document.body.appendChild(link);

      // Trigger download and cleanup
      link.click();
      document.body.removeChild(link);
    } catch (error) {
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
   * The method also applies the appropriate Carbon theme class (cds--g90 for dark, cds--white for light)
   * to ensure proper styling based on the `dark` property.
   *
   * @returns The lit-html template for the table component
   * @public
   */
  render() {
    // TODO TABLE: Once we have a web component version of the inline error state we could render that here if
    // !this._isValid.

    // This could be used while we wait for a md stream containing a table to complete.
    if (this.loading) {
      return tableSkeletonTemplate(this._currentPageSize);
    }

    // If there are more rows than the page size then we need to add the pagination component. If the rows per page has
    // been changed by the pagination component then we need to keep the pagination component around so the user can
    // change the page size again, even if the current page size is the same as the number of table rows.
    if (this.rows.length > this._currentPageSize || this._rowsPerPageChanged) {
      return html`<div class="cds-ai-chat-table-container">
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
    return html`<div class="cds-ai-chat-table-container">
      ${tableTemplate(this)}
    </div>`;
  }
}

export { TableElement, TABLE_COMPONENT_TAG_NAME };

export default TableElement;
