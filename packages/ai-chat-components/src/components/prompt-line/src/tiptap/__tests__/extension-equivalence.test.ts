/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from '@open-wc/testing';
import { Extension } from '@tiptap/core';

import {
  buildCarbonExtensions,
  type BuildCarbonExtensionsConfig,
} from '../build-extensions.js';
import {
  areExtensionSetsEquivalent,
  getExtensionSource,
} from '../extension-equivalence.js';
import type { SuggestionItem } from '../types.js';

const PEOPLE: SuggestionItem[] = [{ id: 'u1', label: 'Alice' }];
const STARTERS: SuggestionItem[] = [{ id: 's1', label: 'Summarize this' }];

describe('areExtensionSetsEquivalent', function () {
  it('treats the same array as equivalent', () => {
    const set = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE },
    });
    expect(areExtensionSetsEquivalent(set, set)).to.equal(true);
  });

  it('treats a rebuild from the same configs as equivalent', () => {
    // The exact churn from issue #2152: the host config is value-identical but
    // every object identity is fresh.
    const configs = { mention: { trigger: '@', items: PEOPLE } };
    expect(
      areExtensionSetsEquivalent(
        buildCarbonExtensions(configs),
        buildCarbonExtensions(configs)
      )
    ).to.equal(true);
  });

  it('treats value-identical but freshly-allocated configs as equivalent', () => {
    const previous = buildCarbonExtensions({
      mention: { trigger: '@', items: [{ id: 'u1', label: 'Alice' }] },
    });
    const next = buildCarbonExtensions({
      mention: { trigger: '@', items: [{ id: 'u1', label: 'Alice' }] },
    });
    expect(areExtensionSetsEquivalent(previous, next)).to.equal(true);
  });

  it('detects a changed trigger character', () => {
    const previous = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE },
    });
    const next = buildCarbonExtensions({
      mention: { trigger: '#', items: PEOPLE },
    });
    expect(areExtensionSetsEquivalent(previous, next)).to.equal(false);
  });

  it('detects a changed callback identity', () => {
    const previous = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE, onSelect: () => {} },
    });
    const next = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE, onSelect: () => {} },
    });
    expect(areExtensionSetsEquivalent(previous, next)).to.equal(false);
  });

  it('treats a rebuild as equivalent for every carbon kind', () => {
    // One case per factory branch. A branch that stops tagging its output still
    // passes the mention-only cases above while recreating the editor for that
    // host on every config rebuild.
    const configs: BuildCarbonExtensionsConfig[] = [
      { mention: { trigger: '@', items: PEOPLE } },
      { command: { trigger: '/', items: PEOPLE } },
      { autocomplete: { items: PEOPLE } },
      { starters: { items: STARTERS } },
    ];
    configs.forEach((config) => {
      expect(
        areExtensionSetsEquivalent(
          buildCarbonExtensions(config),
          buildCarbonExtensions(config)
        ),
        JSON.stringify(config)
      ).to.equal(true);
    });
  });

  it('detects a changed command trigger', () => {
    const previous = buildCarbonExtensions({
      command: { trigger: '/', items: PEOPLE },
    });
    const next = buildCarbonExtensions({
      command: { trigger: '!', items: PEOPLE },
    });
    expect(areExtensionSetsEquivalent(previous, next)).to.equal(false);
  });

  it('detects a changed autocomplete item list', () => {
    const previous = buildCarbonExtensions({ autocomplete: { items: PEOPLE } });
    const next = buildCarbonExtensions({
      autocomplete: { items: [{ id: 'u2', label: 'Bob' }] },
    });
    expect(areExtensionSetsEquivalent(previous, next)).to.equal(false);
  });

  it('detects a changed length', () => {
    const previous = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE },
    });
    const next = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE },
      command: { trigger: '/', items: PEOPLE },
    });
    expect(areExtensionSetsEquivalent(previous, next)).to.equal(false);
  });

  it('detects a reorder — extension order is plugin order', () => {
    const [mention, command] = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE },
      command: { trigger: '/', items: PEOPLE },
    });
    expect(
      areExtensionSetsEquivalent([mention, command], [command, mention])
    ).to.equal(false);
  });

  it('compares host-supplied extensions by reference', () => {
    const host = Extension.create({ name: 'hostThing' });
    expect(areExtensionSetsEquivalent([host], [host])).to.equal(true);
    expect(
      areExtensionSetsEquivalent(
        [host],
        [Extension.create({ name: 'hostThing' })]
      )
    ).to.equal(false);
  });

  it('never lets a carbon extension match a host one of the same shape', () => {
    const carbon = buildCarbonExtensions({
      mention: { trigger: '@', items: PEOPLE },
    });
    expect(
      areExtensionSetsEquivalent(carbon, [
        Extension.create({ name: 'mention' }),
      ])
    ).to.equal(false);
  });

  describe('starter triggers', function () {
    // Starter differences are applied to live editor storage instead of
    // recreating the editor, so they must never read as a different set.
    it('is equivalent across an isOn toggle', () => {
      const previous = buildCarbonExtensions({
        starters: { items: STARTERS, isOn: true },
      });
      const next = buildCarbonExtensions({
        starters: { items: STARTERS, isOn: false },
      });
      expect(areExtensionSetsEquivalent(previous, next)).to.equal(true);
    });

    it('is equivalent across an items swap', () => {
      const previous = buildCarbonExtensions({ starters: { items: STARTERS } });
      const next = buildCarbonExtensions({
        starters: { items: [{ id: 's2', label: 'Draft an email' }] },
      });
      expect(areExtensionSetsEquivalent(previous, next)).to.equal(true);
    });

    it('is equivalent when the list empties', () => {
      // The one starters change that used to shorten the set and recreate the
      // editor. The extension is installed for an empty list too, so this is a
      // storage write like any other swap.
      const previous = buildCarbonExtensions({ starters: { items: STARTERS } });
      const next = buildCarbonExtensions({ starters: { items: [] } });
      expect(areExtensionSetsEquivalent(previous, next)).to.equal(true);
    });

    it('still detects a sibling config change alongside starters', () => {
      const previous = buildCarbonExtensions({
        mention: { trigger: '@', items: PEOPLE },
        starters: { items: STARTERS },
      });
      const next = buildCarbonExtensions({
        mention: { trigger: '#', items: PEOPLE },
        starters: { items: STARTERS, isOn: false },
      });
      expect(areExtensionSetsEquivalent(previous, next)).to.equal(false);
    });
  });
});

describe('extension source descriptors', function () {
  it('tags every carbon factory output with its source config', () => {
    // All four branches, or an untagged one falls through to `!prevSource` in
    // `isExtensionEquivalent` and recreates the editor on every rebuild.
    const mention = { trigger: '@', items: PEOPLE };
    const command = { trigger: '/', items: PEOPLE };
    const autocomplete = { items: PEOPLE };
    const starters = { items: STARTERS };
    const built = buildCarbonExtensions({
      mention,
      command,
      autocomplete,
      starters,
    });
    const kinds = built.map((ext) => getExtensionSource(ext)?.kind);
    expect(kinds).to.deep.equal([
      'mention',
      'command',
      'autocomplete',
      'starters',
    ]);
    // The config is held by reference, not copied.
    expect(getExtensionSource(built[0])?.config).to.equal(mention);
    expect(getExtensionSource(built[1])?.config).to.equal(command);
    expect(getExtensionSource(built[2])?.config).to.equal(autocomplete);
    expect(getExtensionSource(built[3])?.config).to.equal(starters);
  });

  it('leaves host extensions untagged', () => {
    expect(
      getExtensionSource(Extension.create({ name: 'hostThing' }))
    ).to.equal(undefined);
  });
});
