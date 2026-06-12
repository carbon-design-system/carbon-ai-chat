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
import "../src/autocomplete-item-group.js";
import type AutocompleteItemGroupElement from "../src/autocomplete-item-group.js";
import type { SuggestionItem } from "../../input/src/types.js";

describe("cds-aichat-autocomplete-item-group", () => {
  const mockItems: SuggestionItem[] = [
    {
      id: "1",
      label: "Item 1",
      description: "Description 1",
    },
    {
      id: "2",
      label: "Item 2",
      description: "Description 2",
    },
    {
      id: "3",
      label: "Item 3",
    },
  ];

  it("should render with title and items", async () => {
    const el = await fixture<AutocompleteItemGroupElement>(html`
      <cds-aichat-autocomplete-item-group
        title="Test Group"
        .items="${mockItems}"
      ></cds-aichat-autocomplete-item-group>
    `);

    expect(el).to.exist;
    const titleElement = el.shadowRoot?.querySelector(
      ".cds-aichat-autocomplete-item-group__title",
    );
    expect(titleElement).to.exist;
    expect(titleElement?.textContent?.trim()).to.equal("Test Group");
  });

  it("should render all items", async () => {
    const el = await fixture<AutocompleteItemGroupElement>(html`
      <cds-aichat-autocomplete-item-group
        title="Test Group"
        .items="${mockItems}"
      ></cds-aichat-autocomplete-item-group>
    `);

    const items = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item",
    );
    expect(items?.length).to.equal(3);
  });

  it("should pass enableSendButton to all items", async () => {
    const el = await fixture<AutocompleteItemGroupElement>(html`
      <cds-aichat-autocomplete-item-group
        title="Test Group"
        .items="${mockItems}"
        .enableSendButton="${false}"
      ></cds-aichat-autocomplete-item-group>
    `);

    const items = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item",
    );
    expect(items?.length).to.equal(3);
    items?.forEach((item) => {
      expect(item.hasAttribute("enable-send-button")).to.be.false;
    });
  });

  it("should not render title when empty", async () => {
    const el = await fixture<AutocompleteItemGroupElement>(html`
      <cds-aichat-autocomplete-item-group
        .items="${mockItems}"
      ></cds-aichat-autocomplete-item-group>
    `);

    const titleElement = el.shadowRoot?.querySelector(
      ".cds-aichat-autocomplete-item-group__title",
    );
    expect(titleElement).to.not.exist;
  });

  it("should render nothing when items array is empty", async () => {
    const el = await fixture<AutocompleteItemGroupElement>(html`
      <cds-aichat-autocomplete-item-group
        title="Empty Group"
        .items="${[]}"
      ></cds-aichat-autocomplete-item-group>
    `);

    const groupElement = el.shadowRoot?.querySelector(
      ".cds-aichat-autocomplete-item-group",
    );
    expect(groupElement).to.not.exist;
  });
});
