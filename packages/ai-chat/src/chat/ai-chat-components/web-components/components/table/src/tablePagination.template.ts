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
import type { TableRowContent } from "../cds-aichat-table";

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
  getPaginationSupplementalText: ({ count }: { count: number }) => string;
  getPaginationStatusText: ({
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

  // TODO TABLE: This component is quite wide. Because of the shadow DOM we can't select it's contents to hide items
  // with css, nor can we extend this class to manipulate it's styles because of Carbon's use of :host(cds-pagination)
  // within their styles. There is however a smaller variation of this component
  // (https://carbondesignsystem.com/components/pagination/usage/#responsive-behavior) but it's only used at a specific
  // breakpoint, when the viewport is narrow (i.e. a mobile device). A Carbon enhancement request has been made to
  // expose a prop that can be used to enable this smaller variation
  // (https://github.com/carbon-design-system/carbon/issues/17564). When that enhancement is done, and we can
  // dynamically enable a narrow form factor of this pagination component, then we could use the same css trick we used
  // for the header to make the pagination component sticky (if the carbon component doesn't already do it for us).
  return html`<cds-pagination
    page-size=${currentPageSize}
    page=${currentPageNumber}
    total-items=${totalVisibleRows}
    totalPages=${Math.ceil(totalVisibleRows / currentPageSize)}
    backward-text=${previousPageText}
    forward-text=${nextPageText}
    items-per-page-text=${itemsPerPageText}
    .formatSupplementalText=${getPaginationSupplementalText}
    .formatStatusWithDeterminateTotal=${getPaginationStatusText}
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
