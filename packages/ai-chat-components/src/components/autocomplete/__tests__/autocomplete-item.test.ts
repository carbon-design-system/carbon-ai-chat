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
import type { SuggestionItem } from "../../prompt-line/src/types.js";

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

  it("has role=option on the list item", async () => {
    const el = await fixture<AutocompleteItemElement>(html`
      <cds-aichat-autocomplete-item
        .item="${mockItem}"
      ></cds-aichat-autocomplete-item>
    `);

    const li = el.shadowRoot?.querySelector("li");
    expect(li?.getAttribute("role")).to.equal("option");
  });

  it("has tabindex=-1 so focus stays in the editor", async () => {
    const el = await fixture<AutocompleteItemElement>(html`
      <cds-aichat-autocomplete-item
        .item="${mockItem}"
      ></cds-aichat-autocomplete-item>
    `);

    const li = el.shadowRoot?.querySelector("li");
    expect(li?.getAttribute("tabindex")).to.equal("-1");
  });

  it("sets aria-selected=false when isActive is false", async () => {
    const el = await fixture<AutocompleteItemElement>(html`
      <cds-aichat-autocomplete-item
        .item="${mockItem}"
        .isActive="${false}"
      ></cds-aichat-autocomplete-item>
    `);

    const li = el.shadowRoot?.querySelector("li");
    expect(li?.getAttribute("aria-selected")).to.equal("false");
  });

  it("sets aria-selected=true and active class when isActive is true", async () => {
    const el = await fixture<AutocompleteItemElement>(html`
      <cds-aichat-autocomplete-item
        .item="${mockItem}"
        .isActive="${true}"
      ></cds-aichat-autocomplete-item>
    `);

    const li = el.shadowRoot?.querySelector("li");
    expect(li?.getAttribute("aria-selected")).to.equal("true");
    expect(li?.classList.contains("cds-aichat-autocomplete-item--active")).to.be
      .true;
  });
});
