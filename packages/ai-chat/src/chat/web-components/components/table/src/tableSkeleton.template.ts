/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/data-table/table-skeleton.js";

import { html } from "lit";

/**
 * Table skeleton view logic.
 */
function tableSkeletonTemplate() {
  // Can add header names to the skeleton if we want to
  // https://web-components.carbondesignsystem.com/?path=/docs/components-datatable-skeleton--overview#custom-headers.
  return html`<cds-custom-table-skeleton row-count="3" column-count="2">
  </cds-custom-table-skeleton>`;
}

export { tableSkeletonTemplate };
