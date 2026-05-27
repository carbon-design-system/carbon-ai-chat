/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { html, fixture, expect } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/table/index.js";
import CDSAIChatTable from "@carbon/ai-chat-components/es/components/table/src/table.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

const headers = [{ text: "A" }, { text: "B" }];
const rows = Array.from({ length: 24 }, (_, i) => ({
  cells: [{ text: `row ${i} A` }, { text: `row ${i} B` }],
}));

describe("aichat table defaultPageSize", function () {
  it("cascades into the current page size after first mount", async () => {
    const el = await fixture<CDSAIChatTable>(
      html`<cds-aichat-table
        .headers=${headers}
        .rows=${rows}
      ></cds-aichat-table>`,
    );
    await el.updateComplete;

    el.defaultPageSize = 20;
    await el.updateComplete;

    expect(el._currentPageSize).to.equal(20);
    expect(el.defaultPageSize).to.equal(20);
  });

  it("preserves a user-selected page size once the pagination dropdown has been used", async () => {
    const el = await fixture<CDSAIChatTable>(
      html`<cds-aichat-table
        .headers=${headers}
        .rows=${rows}
      ></cds-aichat-table>`,
    );
    await el.updateComplete;

    // The table's pagination handler flips `_rowsPerPageChanged` to true
    // the first time the user picks a size from the dropdown. Set the
    // flag here directly so the test stays focused on the setter gate
    // rather than driving the shadow-DOM select.
    el._rowsPerPageChanged = true;
    el._currentPageSize = 15;
    await el.updateComplete;

    el.defaultPageSize = 5;
    await el.updateComplete;

    expect(el._currentPageSize).to.equal(15);
    expect(el.defaultPageSize).to.equal(5);
  });
});
