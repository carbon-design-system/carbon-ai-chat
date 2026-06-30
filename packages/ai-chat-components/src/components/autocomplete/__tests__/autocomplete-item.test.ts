/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { html } from "lit";
import { fixture, expect } from "@open-wc/testing";
import "../src/autocomplete-item.js";
import type AutocompleteItemElement from "../src/autocomplete-item.js";
import type { SuggestionItem } from "../../input/src/types.js";

describe("cds-aichat-autocomplete-item", () => {
  const mockItem: SuggestionItem = {
    id: "1",
    label: "Hello world",
    description: "Description",
  };

  it("renders the send button by default", async () => {
    const el = await fixture<AutocompleteItemElement>(html`
      <cds-aichat-autocomplete-item
        .item="${mockItem}"
      ></cds-aichat-autocomplete-item>
    `);

    const sendButton = el.shadowRoot?.querySelector("cds-icon-button");
    expect(sendButton).to.exist;
  });

  it("does not render the send button when enableSendButton is false", async () => {
    const el = await fixture<AutocompleteItemElement>(html`
      <cds-aichat-autocomplete-item
        .item="${mockItem}"
        .enableSendButton="${false}"
      ></cds-aichat-autocomplete-item>
    `);

    const sendButton = el.shadowRoot?.querySelector("cds-icon-button");
    expect(sendButton).to.not.exist;
  });
});
