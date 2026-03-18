/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/pagination/index.js";
import "@carbon/web-components/es/components/select/index.js";

import { html } from "lit";
import { ifDefined } from "lit/directives/if-defined.js";
import { TableRowContent } from "./table.js";

// Import only the constants, not the class
const POSSIBLE_PAGE_SIZES = [5, 10, 15, 20, 50];

interface TablePaginationProps {
  _currentPageSize: number;
  _currentPageNumber: number;
  _filterVisibleRowIDs: Set<string>;
  rows: TableRowContent[];
  previousPageText: string;
  nextPageText: string;
  itemsPerPageText: string;
  getPaginationSupplementalText?: ({ count }: { count: number }) => string;
  getPaginationStatusText?: ({
    start,
    end,
    count,
  }: {
    start: number;
    end: number;
    count: number;
  }) => string;
  _handlePageChangeEvent: (event: any) => void;
  _handlePageSizeChangeEvent: (event: any) => void;
}

/**
 * Table pagination view logic.
 */
function tablePaginationTemplate(props: TablePaginationProps) {
  const {
    _currentPageSize: currentPageSize,
    _currentPageNumber: currentPageNumber,
    _filterVisibleRowIDs: filterVisibleRowIDs,
    rows,
    previousPageText,
    nextPageText,
    itemsPerPageText,
    getPaginationSupplementalText,
    getPaginationStatusText,
    _handlePageChangeEvent: handlePageChangeEvent,
    _handlePageSizeChangeEvent: handlePageSizeChangeEvent,
  } = props;

  if (!filterVisibleRowIDs || !filterVisibleRowIDs.size) {
    return html``;
  }

  const totalVisibleRows = filterVisibleRowIDs.size;
  const totalRows = rows.length;

  // Page sizes will only be included if the page size is less than the total number of rows.
  const supportedPageSizes = POSSIBLE_PAGE_SIZES.filter(
    (pageSize) => pageSize < totalRows,
  );

  return html`<cds-pagination
    page-size=${currentPageSize}
    page=${currentPageNumber}
    total-items=${totalVisibleRows}
    totalPages=${Math.ceil(totalVisibleRows / currentPageSize)}
    backward-text=${previousPageText}
    forward-text=${nextPageText}
    items-per-page-text=${itemsPerPageText}
    .formatSupplementalText=${ifDefined(getPaginationSupplementalText)}
    .formatStatusWithDeterminateTotal=${ifDefined(getPaginationStatusText)}
    @cds-pagination-changed-current=${handlePageChangeEvent}
    @cds-page-sizes-select-changed=${handlePageSizeChangeEvent}
  >
    ${supportedPageSizes.map(
      (pageSize) =>
        html`<cds-select-item value="${pageSize}"
          >${pageSize}</cds-select-item
        >`,
    )}
    <cds-select-item value="${totalRows}">${totalRows}</cds-select-item>
  </cds-pagination>`;
}

export { tablePaginationTemplate };
