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
import "../src/autocomplete.js";
import type AutocompleteElement from "../src/autocomplete.js";
import type {
  SuggestionItem,
  SuggestionItemGroup,
} from "../src/autocomplete.js";

describe("cds-aichat-autocomplete", () => {
  const mockItems: SuggestionItem[] = [
    {
      id: "1",
      label: "Hello world",
      description: "Description 1",
    },
    {
      id: "2",
      label: "Test item",
      description: "Description 2",
    },
  ];

  const mockGroups: SuggestionItemGroup[] = [
    {
      id: "group-1",
      title: "Group 1",
      items: [
        {
          id: "3",
          label: "Group item 1",
        },
        {
          id: "4",
          label: "Group item 2",
        },
      ],
    },
  ];

  it("should render with items", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete .items="${mockItems}"></cds-aichat-autocomplete>
    `);

    expect(el).to.exist;
    const items = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item",
    );
    expect(items?.length).to.equal(2);
  });

  it("should render with groups", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .groups="${mockGroups}"
      ></cds-aichat-autocomplete>
    `);

    expect(el).to.exist;
    const groups = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item-group",
    );
    expect(groups?.length).to.equal(1);
  });

  it("should render both items and groups", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .items="${mockItems}"
        .groups="${mockGroups}"
      ></cds-aichat-autocomplete>
    `);

    const items = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item",
    );
    const groups = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item-group",
    );
    expect(items?.length).to.equal(2);
    expect(groups?.length).to.equal(1);
  });

  it("should render header when headerConfig is provided", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .items="${mockItems}"
        .headerConfig="${{ showHeader: true, title: "Test Header" }}"
      ></cds-aichat-autocomplete>
    `);

    const header = el.shadowRoot?.querySelector(
      ".cds-aichat-autocomplete__header",
    );
    expect(header).to.exist;
    const title = el.shadowRoot?.querySelector(
      ".cds-aichat-autocomplete__title",
    );
    expect(title?.textContent?.trim()).to.equal("Test Header");
  });

  it("should not render header when showHeader is false", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .items="${mockItems}"
        .headerConfig="${{ showHeader: false, title: "Test Header" }}"
      ></cds-aichat-autocomplete>
    `);

    const header = el.shadowRoot?.querySelector(
      ".cds-aichat-autocomplete__header",
    );
    expect(header).to.not.exist;
  });

  it("should render nothing when no items or groups provided", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete></cds-aichat-autocomplete>
    `);

    const container = el.shadowRoot?.querySelector(".cds-aichat-autocomplete");
    expect(container).to.not.exist;
  });

  it("should emit select event when item is clicked", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete .items="${mockItems}"></cds-aichat-autocomplete>
    `);

    let eventDetail: any = null;
    el.addEventListener("cds-aichat-autocomplete-select", (e: Event) => {
      eventDetail = (e as CustomEvent).detail;
    });

    const firstItem = el.shadowRoot?.querySelector(
      "cds-aichat-autocomplete-item",
    );
    firstItem?.dispatchEvent(new Event("click", { bubbles: true }));

    await el.updateComplete;

    expect(eventDetail).to.exist;
    expect(eventDetail.item).to.deep.equal(mockItems[0]);
  });

  it("should pass enableSendButton to items", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .items="${mockItems}"
        .enableSendButton="${false}"
      ></cds-aichat-autocomplete>
    `);

    const items = el.shadowRoot?.querySelectorAll(
      "cds-aichat-autocomplete-item",
    );
    items?.forEach((item) => {
      expect(item.hasAttribute("enable-send-button")).to.be.false;
    });
  });

  it("should pass inputText to items", async () => {
    const el = await fixture<AutocompleteElement>(html`
      <cds-aichat-autocomplete
        .items="${mockItems}"
        input-text="test"
      ></cds-aichat-autocomplete>
    `);

    expect(el.inputText).to.equal("test");
  });
});
