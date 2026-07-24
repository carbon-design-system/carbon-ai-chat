/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";

import { AriaAnnouncerManager } from "../aria-announcer-manager.js";

const DEBOUNCE_MS = 250;
const SLACK_MS = 50;
const WAIT_MS = DEBOUNCE_MS + SLACK_MS;

function makeRegion(): HTMLDivElement {
  const el = document.createElement("div");
  el.setAttribute("aria-live", "polite");
  document.body.appendChild(el);
  return el;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("AriaAnnouncerManager", function () {
  let regions: HTMLDivElement[];
  let manager: AriaAnnouncerManager;

  afterEach(() => {
    manager?.disconnect();
    regions?.forEach((r) => r.remove());
  });

  it("writes to the first region on initial announce", async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce("hello");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("hello");
    expect(regions[1].textContent).to.equal("");
  });

  it("rotates across two regions, clearing the inactive one", async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce("first");
    await wait(WAIT_MS);
    manager.announce("second");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("");
    expect(regions[1].textContent).to.equal("second");

    manager.announce("third");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("third");
    expect(regions[1].textContent).to.equal("");
  });

  it("rotates across three regions", async () => {
    regions = [makeRegion(), makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce("a");
    await wait(WAIT_MS);
    manager.announce("b");
    await wait(WAIT_MS);
    manager.announce("c");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("");
    expect(regions[1].textContent).to.equal("");
    expect(regions[2].textContent).to.equal("c");

    manager.announce("d");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("d");
    expect(regions[1].textContent).to.equal("");
    expect(regions[2].textContent).to.equal("");
  });

  it("coalesces multiple announces in the same tick into one write", async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce("one");
    manager.announce("two");
    manager.announce("three");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("one two three");
    expect(regions[1].textContent).to.equal("");
  });

  it("disconnect cancels a pending announcement", async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce("dropped");
    manager.disconnect();
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("");
    expect(regions[1].textContent).to.equal("");
  });

  it("ignores empty messages", async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce("");
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal("");
    expect(regions[1].textContent).to.equal("");
  });
});

describe("AriaAnnouncerManager – politeness", function () {
  let polite: HTMLDivElement[];
  let assertive: HTMLDivElement[];
  let manager: AriaAnnouncerManager;

  afterEach(() => {
    manager?.disconnect();
    [...(polite ?? []), ...(assertive ?? [])].forEach((r) => r.remove());
  });

  it("routes assertive messages to assertive regions only", async () => {
    polite = [makeRegion()];
    assertive = [makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(polite, assertive);

    manager.announce("blocking", "assertive");
    await wait(WAIT_MS);

    expect(assertive[0].textContent).to.equal("blocking");
    expect(polite[0].textContent).to.equal("");
  });

  it("defaults to polite", async () => {
    polite = [makeRegion()];
    assertive = [makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(polite, assertive);

    manager.announce("status");
    await wait(WAIT_MS);

    expect(polite[0].textContent).to.equal("status");
    expect(assertive[0].textContent).to.equal("");
  });

  it("falls back to polite when no assertive regions are connected", async () => {
    polite = [makeRegion()];
    assertive = [];
    manager = new AriaAnnouncerManager();
    manager.connect(polite);

    manager.announce("oops", "assertive");
    await wait(WAIT_MS);

    expect(polite[0].textContent).to.equal("oops");
  });

  it("keeps the polite and assertive channels independent", async () => {
    polite = [makeRegion()];
    assertive = [makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(polite, assertive);

    manager.announce("p", "polite");
    manager.announce("a", "assertive");
    await wait(WAIT_MS);

    expect(polite[0].textContent).to.equal("p");
    expect(assertive[0].textContent).to.equal("a");
  });
});
