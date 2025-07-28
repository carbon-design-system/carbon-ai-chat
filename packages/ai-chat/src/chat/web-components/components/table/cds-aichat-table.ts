/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { CDSTableRow } from "@carbon/web-components";
import { bind } from "bind-decorator";
import { stringify } from "csv-stringify/browser/esm/sync";
import { css, html, LitElement, PropertyValues, unsafeCSS } from "lit";
import { property, state } from "lit/decorators.js";

import { carbonElement } from "../../decorators/customElement";
import styles from "./src/table.scss";
import { tableTemplate } from "./src/table.template";
import { tablePaginationTemplate } from "./src/tablePagination.template";
import { tableSkeletonTemplate } from "./src/tableSkeleton.template";
import {
  TableItemCell,
  TableItemRow,
} from "../../../../types/messaging/Messages";

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

interface TableItemRowWithIDs extends TableItemRow {
  id: string;
}

const DEFAULT_TABLE_PAGE_SIZE = 5;
const DEFAULT_TABLE_PAGE_SIZE_TALL_CHAT = 10;
// The supported possible page sizes are 5, 10, 15, 20, 50, and all rows.
const POSSIBLE_PAGE_SIZES = [
  DEFAULT_TABLE_PAGE_SIZE,
  DEFAULT_TABLE_PAGE_SIZE_TALL_CHAT,
  15,
  20,
  50,
];

const TALL_CHAT_HEIGHT = 850;

// We will have to give this component a unique ID on the name when we register it to avoid conflicts in a world where
// multiple versions of the Carbon AI chat can be on the same page.
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
  @property({ type: Array })
  headers: TableItemCell[];

  /**
   * The array of rows. Each row includes an array of cells and an optional expandable_section.
   */
  @property({ type: Array })
  rows: TableItemRow[];

  /**
   * The width of the container containing this table. Used to create a sticky header on the table component.
   */
  @property({ type: Number, attribute: "container-width" })
  containerWidth: number;

  /**
   * The height of the chat container that contains this table as a response type. This is used to determine how many
   * rows to render on each page.
   */
  @property({ type: Number, attribute: "chat-height" })
  chatHeight: number;

  /**
   * Whether or not the table content is loading. If it is than a skeleton state should be shown instead.
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
  public _currentPageSize: number;

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
  public _rowsWithIDs: TableItemRowWithIDs[] = [];

  /**
   * Whether or not the table should be able to be filtered.
   */
  @state()
  public _allowFiltering: boolean;

  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * Depending on the properties that changed validate the table or change the number of rows displayed in the table.
   * There is also a [firstUpdated](https://lit.dev/docs/components/lifecycle/#firstupdated) function from lit that only
   * fires after the components DOM has been updated the first time. That could potentially be used in these scenarios /
   * similar scenarios as it seems similar to the old componentDidMount. For now use this broader function to make sure
   * we see the prop updates we're expecting.
   */
  protected updated(changedProperties: PropertyValues<this>) {
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
    }

    // If the page size is not currently defined, and the chatHeight has been set, then this is the first render and we
    // need to choose the starting page size based off the chatHeight.
    if (
      this._currentPageSize === undefined &&
      changedProperties.has("chatHeight") &&
      this.chatHeight !== changedProperties.get("chatHeight")
    ) {
      this._initializePageSize();
    }
  }

  /**
   * Check if the table content is valid. A table is valid if the number of cells in each row is the same as the number
   * of cells in the header.
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
   * Create a new array of rows that includes ids for each row. Also build an array of those same ids representing the
   * rows that have not been filtered out.
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
   * If the chat container is over a certain height then show more rows per page.
   */
  private _initializePageSize() {
    // If the chat container is above a certain height then show more rows per page.
    if (this.chatHeight > TALL_CHAT_HEIGHT) {
      this._currentPageSize = DEFAULT_TABLE_PAGE_SIZE_TALL_CHAT;
    } else {
      this._currentPageSize = DEFAULT_TABLE_PAGE_SIZE;
    }

    // If there are more rows than the page size then enable filtering.
    this._allowFiltering = this.rows.length > this._currentPageSize;

    // Update the visible rows in case the page size has changed or this is the first time this web component has
    // rendered.
    this._updateVisibleRows();
  }

  /**
   * When the page change event is fired by the pagination component, change which rows are visible. For some reason
   * only this event is firing twice. However the page size and number is the same both times so the functionality of
   * the pagination component works as expected. Ignore this double firing for now since it appears to be a bug on
   * Carbon's end that will likely be fixed in a future release.
   */
  @bind
  public _handlePageChangeEvent(event: PageChangeEvent) {
    this._updateVisibleRows(event.detail?.page, event.detail?.pageSize);
    event.stopPropagation();
  }

  /**
   * When the number of rows per page is changed, update the current page size and change which rows are visible.
   */
  @bind
  public _handlePageSizeChangeEvent(event: PageChangeEvent) {
    this._rowsPerPageChanged = true;
    this._currentPageSize = event.detail?.pageSize;
    this._updateVisibleRows();
    event.stopPropagation();
  }

  /**
   * When the filter event is fired, record which rows have not been filtered out, and update which rows are visible.
   * This event is fired when the columns are sorted using the header cells AND when the table is filtered using the
   * search bar.
   */
  @bind
  public _handleFilterEvent(event: FilterEvent) {
    // Record the new set of unfiltered row ids.
    this._filterVisibleRowIDs = new Set(
      event?.detail?.unfilteredRows.map((row) => row.id)
    );

    // Go back to the first page.
    this._currentPageNumber = 1;

    // Update which rows are visible.
    this._updateVisibleRows();
    event.stopPropagation();
  }

  /**
   * Given the current page number, page size, and array of rows that have not been filtered out, determine which rows
   * to show and hide using css.
   */
  private _updateVisibleRows(
    page: number = this._currentPageNumber,
    pageSize: number = this._currentPageSize
  ) {
    // Set the current page number and only show the rows for that page.
    this._currentPageNumber = page;

    // Grab all the rows that have been rendered. It's necessary to grab them from the page because the cds-custom-table puts
    // the rows in a specific order when sorting and we want to preserve that order.
    const rows: HTMLElement[] = Array.from(
      this.renderRoot.querySelectorAll("cds-custom-table-row")
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
      this._filterVisibleRowIDs.has(row.id)
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
   * Carbon's data table component by default only downloads rows that have been selected, and only downloads json. We
   * don't want to implement selection at this time and we want our download to be csv so we need to implement own
   * download function.
   */
  public _handleDownload() {
    // Don't save content from the expandable rows at this time. This could be added in the future but it's unclear how
    // this would look in the download.
    const tableArray: TableItemCell[][] = [
      this.headers,
      ...this.rows.map((row) => row.cells),
    ];

    // stringify docs here: https://csv.js.org/stringify/api/sync/
    const stringifiedTable = stringify(tableArray);

    const blob = new Blob([stringifiedTable], {
      type: "text/csv;charset=utf-8;",
    });

    // It appears the only way to control the file name of a downloaded file is through an anchor element with a
    // download attribute. So create such an element and add our data to be downloaded.
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "table-data.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);

    // Click on the link we've created to download the blob with our stringified table data.
    link.click();
    document.body.removeChild(link);
  }

  /**
   * Renders either the table skeleton or the table. If the table is larger than the page size then also render the
   * pagination component to change pages.
   */
  render() {
    // TODO TABLE: Once we have a web component version of the inline error state we could render that here if
    // !this._isValid.

    // This could be used while we wait for a md stream containing a table to complete.
    if (this.loading) {
      return tableSkeletonTemplate();
    }

    // If there are more rows than the page size then we need to add the pagination component. If the rows per page has
    // been changed by the pagination component then we need to keep the pagination component around so the user can
    // change the page size again, even if the current page size is the same as the number of table rows.
    if (this.rows.length > this._currentPageSize || this._rowsPerPageChanged) {
      return html`${tableTemplate(this)} ${tablePaginationTemplate({
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
      })}`;
    }

    // Otherwise, just render the table.
    return html`${tableTemplate(this)}`;
  }
}

export { TableElement, TABLE_COMPONENT_TAG_NAME };

export default TableElement;
