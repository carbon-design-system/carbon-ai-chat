/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es-custom/components/data-table/index.js";
import "@carbon/web-components/es-custom/components/checkbox/index.js";
import "@carbon/web-components/es-custom/components/button/index.js";
import "@carbon/web-components/es-custom/components/layer/index.js";

import { toString } from "@carbon/icon-helpers";
import Download16 from "@carbon/icons/es/download/16.js";
import { html } from "lit";
import { unsafeSVG } from "lit/directives/unsafe-svg.js";
import { repeat } from "lit-html/directives/repeat.js";

import type { TableElement } from "../cds-aichat-table";

const Download16svg = toString({
  ...Download16,
  attrs: {
    ...Download16.attrs,
    slot: "icon",
  },
});

/**
 * Table view logic.
 */
function tableTemplate(tableElement: TableElement) {
  const {
    tableTitle,
    tableDescription,
    headers,
    filterPlaceholderText,
    locale,
    _handleDownload: handleDownload,
    _rowsWithIDs: tableRowsWithIDs,
    _allowFiltering: allowTableFiltering,
    _handleFilterEvent: handleFilterEvent,
  } = tableElement;

  function toolbarElement() {
    return html`<cds-custom-table-toolbar slot="toolbar">
      <cds-custom-table-toolbar-content>
        ${allowTableFiltering
          ? html`<cds-custom-table-toolbar-search
              persistent
              placeholder=${filterPlaceholderText}
            ></cds-custom-table-toolbar-search>`
          : ""}
        <cds-custom-button @click=${handleDownload}
          >${unsafeSVG(Download16svg)}</cds-custom-button
        >
      </cds-custom-table-toolbar-content>
    </cds-custom-table-toolbar>`;
  }

  function headersElement() {
    return html`<cds-custom-table-head>
      <cds-custom-table-header-row>
        ${headers.map(
          (header) =>
            html`<cds-custom-table-header-cell
              >${header}</cds-custom-table-header-cell
            >`,
        )}
      </cds-custom-table-header-row>
    </cds-custom-table-head>`;
  }

  function rowsElement() {
    return html`<cds-custom-table-body>
      ${repeat(
        tableRowsWithIDs,
        (row) => row.id,
        (row) =>
          html`<cds-custom-table-row id=${row.id}
            >${row.cells.map(
              (cell) =>
                html`<cds-custom-table-cell>${cell}</cds-custom-table-cell>`,
            )}</cds-custom-table-row
          >`,
      )}
    </cds-custom-table-body>`;
  }

  // TODO TABLE: There is a bug with size="sm" and is-sortable that prevents the header row from being the same size as
  // the rest of the rows https://github.com/carbon-design-system/carbon/issues/17680. For now keep size="md" until that
  // bug is fixed.

  // Enable sorting if filtering is enabled.
  return html`<cds-custom-layer level="1"
    ><cds-custom-table
      size="md"
      locale=${locale}
      .isSortable=${allowTableFiltering}
      .useZebraStyles=${true}
      @cds-custom-table-filtered=${handleFilterEvent}
    >
      ${tableTitle &&
      html`<cds-custom-table-header-title slot="title"
        >${tableTitle}</cds-custom-table-header-title
      >`}
      ${tableDescription &&
      html`<cds-custom-table-header-description slot="description"
        >${tableDescription}</cds-custom-table-header-description
      >`}
      ${toolbarElement()} ${headersElement()} ${rowsElement()}
    </cds-custom-table></cds-custom-layer
  >`;
}

export { tableTemplate };
