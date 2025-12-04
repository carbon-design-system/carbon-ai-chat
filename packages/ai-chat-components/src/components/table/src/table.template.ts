/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/data-table/index.js";
import "@carbon/web-components/es/components/checkbox/index.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/layer/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Download16 from "@carbon/icons/es/download/16.js";
import { html } from "lit";
import { repeat } from "lit-html/directives/repeat.js";

import type { CDSAIChatTable } from "./table.js";

/**
 * Table view logic.
 */
function tableTemplate(tableElement: CDSAIChatTable) {
  const {
    tableTitle,
    tableDescription,
    headers,
    filterPlaceholderText,
    downloadLabelText,
    locale,
    _handleDownload: handleDownload,
    _rowsWithIDs: tableRowsWithIDs,
    _allowFiltering: allowTableFiltering,
    _handleFilterEvent: handleFilterEvent,
  } = tableElement;

  function toolbarElement() {
    return html`<cds-table-toolbar slot="toolbar">
      <cds-table-toolbar-content>
        ${allowTableFiltering
          ? html`<cds-table-toolbar-search
              persistent
              placeholder=${filterPlaceholderText}
            ></cds-table-toolbar-search>`
          : ""}
        <cds-button @click=${handleDownload} aria-label=${downloadLabelText}
          >${iconLoader(Download16)}</cds-button
        >
      </cds-table-toolbar-content>
    </cds-table-toolbar>`;
  }

  function headersElement() {
    return html`<cds-table-head>
      <cds-table-header-row>
        ${headers.map(
          (header) =>
            html`<cds-table-header-cell
              >${header.template ?? header.text}</cds-table-header-cell
            >`,
        )}
      </cds-table-header-row>
    </cds-table-head>`;
  }

  function rowsElement() {
    return html`<cds-table-body>
      ${repeat(
        tableRowsWithIDs,
        (row) => row.id,
        (row) =>
          html`<cds-table-row id=${row.id}
            >${row.cells.map((cell) => {
              return html`<cds-table-cell
                >${cell.template ?? cell.text}</cds-table-cell
              >`;
            })}</cds-table-row
          >`,
      )}
    </cds-table-body>`;
  }

  // TODO TABLE: There is a bug with size="sm" and is-sortable that prevents the header row from being the same size as
  // the rest of the rows https://github.com/carbon-design-system/carbon/issues/17680. For now keep size="md" until that
  // bug is fixed.

  // Enable sorting if filtering is enabled.
  return html`<cds-table
    size="md"
    locale=${locale}
    .isSortable=${allowTableFiltering}
    .useZebraStyles=${true}
    @cds-table-filtered=${handleFilterEvent}
  >
    ${tableTitle &&
    html`<cds-table-header-title slot="title"
      >${tableTitle}</cds-table-header-title
    >`}
    ${tableDescription &&
    html`<cds-table-header-description slot="description"
      >${tableDescription}</cds-table-header-description
    >`}
    ${toolbarElement()} ${headersElement()} ${rowsElement()}
  </cds-table>`;
}

export { tableTemplate };
