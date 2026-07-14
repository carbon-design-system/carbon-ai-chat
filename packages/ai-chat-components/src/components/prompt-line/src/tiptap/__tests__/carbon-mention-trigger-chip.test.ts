/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";

import { resolveShowTriggerInChip } from "../carbon-mention.js";
import type { SuggestionItem, TriggerSuggestionConfig } from "../types.js";

const ITEM: SuggestionItem = { id: "u1", label: "Alice" };

describe("tiptap/carbon-mention resolveShowTriggerInChip", function () {
  it("defaults to the command/mention type when item and config are unset", () => {
    expect(resolveShowTriggerInChip(ITEM, {}, true)).to.equal(true);
    expect(resolveShowTriggerInChip(ITEM, {}, false)).to.equal(false);
  });

  it("config.showTriggerInChip overrides the type default", () => {
    const on: Pick<TriggerSuggestionConfig, "showTriggerInChip"> = {
      showTriggerInChip: true,
    };
    expect(resolveShowTriggerInChip(ITEM, on, false)).to.equal(true);

    const off: Pick<TriggerSuggestionConfig, "showTriggerInChip"> = {
      showTriggerInChip: false,
    };
    expect(resolveShowTriggerInChip(ITEM, off, true)).to.equal(false);
  });

  it("item.showTriggerInChip wins over both config and the type default", () => {
    const item: SuggestionItem = { ...ITEM, showTriggerInChip: true };
    expect(
      resolveShowTriggerInChip(item, { showTriggerInChip: false }, false),
    ).to.equal(true);

    const itemOff: SuggestionItem = { ...ITEM, showTriggerInChip: false };
    expect(
      resolveShowTriggerInChip(itemOff, { showTriggerInChip: true }, true),
    ).to.equal(false);
  });
});
