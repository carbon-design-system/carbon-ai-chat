/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';

import {
  AriaAnnouncerManager,
  mountAriaAnnouncer,
} from '../aria-announcer-manager.js';

const DEBOUNCE_MS = 250;
const SLACK_MS = 50;
const WAIT_MS = DEBOUNCE_MS + SLACK_MS;

function makeRegion(): HTMLDivElement {
  const el = document.createElement('div');
  el.setAttribute('aria-live', 'polite');
  document.body.appendChild(el);
  return el;
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('AriaAnnouncerManager', function () {
  let regions: HTMLDivElement[];
  let manager: AriaAnnouncerManager;

  afterEach(() => {
    manager?.disconnect();
    regions?.forEach((r) => r.remove());
  });

  it('writes to the first region on initial announce', async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce('hello');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('hello');
    expect(regions[1].textContent).to.equal('');
  });

  it('rotates across two regions, clearing the inactive one', async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce('first');
    await wait(WAIT_MS);
    manager.announce('second');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('');
    expect(regions[1].textContent).to.equal('second');

    manager.announce('third');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('third');
    expect(regions[1].textContent).to.equal('');
  });

  it('rotates across three regions', async () => {
    regions = [makeRegion(), makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce('a');
    await wait(WAIT_MS);
    manager.announce('b');
    await wait(WAIT_MS);
    manager.announce('c');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('');
    expect(regions[1].textContent).to.equal('');
    expect(regions[2].textContent).to.equal('c');

    manager.announce('d');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('d');
    expect(regions[1].textContent).to.equal('');
    expect(regions[2].textContent).to.equal('');
  });

  it('coalesces multiple announces in the same tick into one write', async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce('one');
    manager.announce('two');
    manager.announce('three');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('one two three');
    expect(regions[1].textContent).to.equal('');
  });

  it('disconnect cancels a pending announcement', async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce('dropped');
    manager.disconnect();
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('');
    expect(regions[1].textContent).to.equal('');
  });

  it('ignores empty messages', async () => {
    regions = [makeRegion(), makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(regions);

    manager.announce('');
    await wait(WAIT_MS);

    expect(regions[0].textContent).to.equal('');
    expect(regions[1].textContent).to.equal('');
  });
});

describe('AriaAnnouncerManager – politeness', function () {
  let polite: HTMLDivElement[];
  let assertive: HTMLDivElement[];
  let manager: AriaAnnouncerManager;

  afterEach(() => {
    manager?.disconnect();
    [...(polite ?? []), ...(assertive ?? [])].forEach((r) => r.remove());
  });

  it('routes assertive messages to assertive regions only', async () => {
    polite = [makeRegion()];
    assertive = [makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(polite, assertive);

    manager.announce('blocking', 'assertive');
    await wait(WAIT_MS);

    expect(assertive[0].textContent).to.equal('blocking');
    expect(polite[0].textContent).to.equal('');
  });

  it('defaults to polite', async () => {
    polite = [makeRegion()];
    assertive = [makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(polite, assertive);

    manager.announce('status');
    await wait(WAIT_MS);

    expect(polite[0].textContent).to.equal('status');
    expect(assertive[0].textContent).to.equal('');
  });

  it('falls back to polite when no assertive regions are connected', async () => {
    polite = [makeRegion()];
    assertive = [];
    manager = new AriaAnnouncerManager();
    manager.connect(polite);

    manager.announce('oops', 'assertive');
    await wait(WAIT_MS);

    expect(polite[0].textContent).to.equal('oops');
  });

  it('keeps the polite and assertive channels independent', async () => {
    polite = [makeRegion()];
    assertive = [makeRegion()];
    manager = new AriaAnnouncerManager();
    manager.connect(polite, assertive);

    manager.announce('p', 'polite');
    manager.announce('a', 'assertive');
    await wait(WAIT_MS);

    expect(polite[0].textContent).to.equal('p');
    expect(assertive[0].textContent).to.equal('a');
  });
});

describe('mountAriaAnnouncer', function () {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('creates the requested number of polite regions', () => {
    const handle = mountAriaAnnouncer(container, { politeCount: 3 });
    const politeRegions = container.querySelectorAll('[aria-live="polite"]');
    expect(politeRegions.length).to.equal(3);
    handle.disconnect();
  });

  it('creates the requested number of assertive regions', () => {
    const handle = mountAriaAnnouncer(container, {
      politeCount: 1,
      assertiveCount: 2,
    });
    const assertiveRegions = container.querySelectorAll(
      '[aria-live="assertive"]'
    );
    expect(assertiveRegions.length).to.equal(2);
    handle.disconnect();
  });

  it('defaults to 1 polite region and 0 assertive regions', () => {
    const handle = mountAriaAnnouncer(container);
    expect(container.querySelectorAll('[aria-live="polite"]').length).to.equal(
      1
    );
    expect(
      container.querySelectorAll('[aria-live="assertive"]').length
    ).to.equal(0);
    handle.disconnect();
  });

  it('routes a polite announce to the polite region', async () => {
    const handle = mountAriaAnnouncer(container, { politeCount: 1 });
    const politeRegion = container.querySelector(
      '[aria-live="polite"]'
    ) as HTMLDivElement;

    handle.announce('status update');
    await wait(WAIT_MS);

    expect(politeRegion.textContent).to.equal('status update');
    handle.disconnect();
  });

  it('routes an assertive announce to the assertive region', async () => {
    const handle = mountAriaAnnouncer(container, {
      politeCount: 1,
      assertiveCount: 1,
    });
    const assertiveRegion = container.querySelector(
      '[aria-live="assertive"]'
    ) as HTMLDivElement;
    const politeRegion = container.querySelector(
      '[aria-live="polite"]'
    ) as HTMLDivElement;

    handle.announce('blocking error', 'assertive');
    await wait(WAIT_MS);

    expect(assertiveRegion.textContent).to.equal('blocking error');
    expect(politeRegion.textContent).to.equal('');
    handle.disconnect();
  });

  it('disconnect cancels pending timers and removes created regions', async () => {
    const politeRegion = document.createElement('div');
    container.appendChild(politeRegion);

    const handle = mountAriaAnnouncer(container, {
      politeCount: 2,
      assertiveCount: 1,
    });

    // Capture a reference to one of the created regions before they are removed.
    const createdRegion = container.querySelector(
      '[aria-live]'
    ) as HTMLDivElement;

    handle.announce('dropped');
    handle.disconnect();
    await wait(WAIT_MS);

    // All created live regions are removed from the container.
    expect(container.querySelectorAll('[aria-live]').length).to.equal(0);
    // The pending message was not written after disconnect.
    expect(createdRegion.textContent).to.equal('');
  });

  it('sets aria-atomic on regions when ariaAtomic is true', () => {
    const handle = mountAriaAnnouncer(container, {
      politeCount: 1,
      assertiveCount: 1,
      ariaAtomic: true,
    });
    const regions = container.querySelectorAll('[aria-live]');
    regions.forEach((region) => {
      expect(region.getAttribute('aria-atomic')).to.equal('true');
    });
    handle.disconnect();
  });

  it('omits aria-atomic when ariaAtomic is false (default)', () => {
    const handle = mountAriaAnnouncer(container, {
      politeCount: 1,
      assertiveCount: 1,
    });
    const regions = container.querySelectorAll('[aria-live]');
    regions.forEach((region) => {
      expect(region.hasAttribute('aria-atomic')).to.equal(false);
    });
    handle.disconnect();
  });
});
