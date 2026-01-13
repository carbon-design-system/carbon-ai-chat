/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import '@carbon/web-components/es-custom/components/pagination/index.js';
import '@carbon/web-components/es-custom/components/select/index.js';
import { html } from 'lit';

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
// Import only the constants, not the class
const POSSIBLE_PAGE_SIZES = [5, 10, 15, 20, 50];
/**
 * Table pagination view logic.
 */
function tablePaginationTemplate(props) {
    const { _currentPageSize: currentPageSize, _currentPageNumber: currentPageNumber, _filterVisibleRowIDs: filterVisibleRowIDs, rows, previousPageText, nextPageText, itemsPerPageText, getPaginationSupplementalText, getPaginationStatusText, _handlePageChangeEvent: handlePageChangeEvent, _handlePageSizeChangeEvent: handlePageSizeChangeEvent, } = props;
    if (!filterVisibleRowIDs || !filterVisibleRowIDs.size) {
        return html ``;
    }
    const totalVisibleRows = filterVisibleRowIDs.size;
    const totalRows = rows.length;
    // Page sizes will only be included if the page size is less than the total number of rows.
    const supportedPageSizes = POSSIBLE_PAGE_SIZES.filter((pageSize) => pageSize < totalRows);
    return html `<cds-custom-pagination
    page-size=${currentPageSize}
    page=${currentPageNumber}
    total-items=${totalVisibleRows}
    totalPages=${Math.ceil(totalVisibleRows / currentPageSize)}
    backward-text=${previousPageText}
    forward-text=${nextPageText}
    items-per-page-text=${itemsPerPageText}
    .formatSupplementalText=${getPaginationSupplementalText}
    .formatStatusWithDeterminateTotal=${getPaginationStatusText}
    @cds-custom-pagination-changed-current=${handlePageChangeEvent}
    @cds-custom-page-sizes-select-changed=${handlePageSizeChangeEvent}
  >
    ${supportedPageSizes.map((pageSize) => html `<cds-custom-select-item value="${pageSize}"
          >${pageSize}</cds-custom-select-item
        >`)}
    <cds-custom-select-item value="${totalRows}">${totalRows}</cds-custom-select-item>
  </cds-custom-pagination>`;
}

export { tablePaginationTemplate };
//# sourceMappingURL=table-pagination.template.js.map
