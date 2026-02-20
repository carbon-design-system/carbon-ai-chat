/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import { html } from "lit";
import "@carbon/web-components/es/components/tag/tag.js";
import "@carbon/web-components/es/components/data-table/table.js";
import "@carbon/web-components/es/components/data-table/table-head.js";
import "@carbon/web-components/es/components/data-table/table-header-row.js";
import "@carbon/web-components/es/components/data-table/table-header-cell.js";
import "@carbon/web-components/es/components/data-table/table-body.js";
import "@carbon/web-components/es/components/data-table/table-row.js";
import "@carbon/web-components/es/components/data-table/table-cell.js";
import "@carbon/web-components/es/components/data-table/table-toolbar.js";
import "@carbon/web-components/es/components/data-table/table-toolbar-content.js";
import "@carbon/web-components/es/components/data-table/table-toolbar-search.js";
import "@carbon/web-components/es/components/data-table/table-header-title.js";
import "@carbon/web-components/es/components/data-table/table-header-description.js";
import "@carbon/web-components/es/components/button/button.js";
import "../../code-snippet/index.js";
import { multilineCode } from "./story-data.js";
import {
  headers as tableHeaders,
  rows as tableRows,
} from "../../table/__stories__/story-data.js";

export function getHeaderDescription(type) {
  switch (type) {
    case "basic":
      return html`
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
      `;
    case "withTags":
      return html`
        <div slot="header-description">
          Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do
          eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad
          minim veniam, quis nostrud exercitation ullamco.
        </div>
        <div slot="header-description">
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
          <cds-tag size="sm" type="gray">Tag</cds-tag>
        </div>
      `;
  }
}

export function getBodyContent(type) {
  switch (type) {
    case "short":
      return html`
        Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod
        tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim
        veniam, quis nostrud exercitation ullamco.
      `;
    case "long":
      return html`
        <div>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            et velit sed erat faucibus blandit non nec felis. Nulla facilisi.
            Pellentesque nec finibus lectus. Vestibulum vitae sem eget lacus
            aliquam congue vitae ut elit.
          </p>
          <br />
          <cds-aichat-code-snippet-card language="typescript" highlight>
            ${multilineCode}
          </cds-aichat-code-snippet-card>
          <br />
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Curabitur
            et velit sed erat faucibus blandit non nec felis.
          </p>
          <br />
          <cds-table>
            <cds-table-header-title slot="title"
              >Agent roster</cds-table-header-title
            >
            <cds-table-header-description slot="description">
              Operational view of AI chat team members.
            </cds-table-header-description>
            <cds-table-toolbar slot="toolbar">
              <cds-table-toolbar-content>
                <cds-table-toolbar-search
                  placeholder="Filter table"
                  persistent
                ></cds-table-toolbar-search>
                <cds-button>Add new</cds-button>
              </cds-table-toolbar-content>
            </cds-table-toolbar>
            <cds-table-head>
              <cds-table-header-row>
                ${tableHeaders.map(
                  (header) =>
                    html`<cds-table-header-cell
                      >${header.text}</cds-table-header-cell
                    >`,
                )}
              </cds-table-header-row>
            </cds-table-head>
            <cds-table-body>
              ${tableRows.map(
                (row) => html`
                  <cds-table-row>
                    ${row.cells.map(
                      (cell) =>
                        html`<cds-table-cell>${cell.text}</cds-table-cell>`,
                    )}
                  </cds-table-row>
                `,
              )}
            </cds-table-body>
          </cds-table>
          <br />
          <p>
            Fusce egestas sapien id sem luctus, nec hendrerit velit elementum.
            In in justo a nunc accumsan vestibulum. Quisque ut interdum est.
            Proin id felis ac justo blandit dictum. Suspendisse in tellus a
            risus fermentum volutpat vel quis leo. Curabitur varius, libero at
            pulvinar suscipit, urna nisi volutpat felis, sed maximus diam eros
            non metus.
          </p>
        </div>
      `;
  }
}
