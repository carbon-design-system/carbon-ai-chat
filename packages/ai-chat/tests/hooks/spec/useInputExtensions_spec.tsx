/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Memo-dependency coverage for `useInputExtensions`. The end-to-end config path
 * cannot pin these: `mergePublicConfig` clones `starters.items` on every update,
 * so the memo recomputes on `items` identity whatever else is listed, and a
 * dropped dependency stays invisible. Holding `items` stable across renders is
 * the only way to isolate the remaining fields.
 */

import { renderHook } from '@testing-library/react';

import { useInputExtensions } from '../../../src/chat/hooks/useInputExtensions';
import type { StartersConfig } from '../../../src/types/config/InputConfig';

/** Stable reference, exactly as a host holding a module constant supplies it. */
const STARTER_ITEMS = [{ id: 's1', label: 'Summarize this' }];

function renderStarters(starters: StartersConfig) {
  return renderHook(
    (props: { starters: StartersConfig }) =>
      useInputExtensions({
        mention: undefined,
        command: undefined,
        autocomplete: undefined,
        starters: props.starters,
        hostExtensions: undefined,
        // The curated bundle needs the lazily-loaded builder; the normalized
        // configs these cases pin are computed either way.
        enabled: false,
      }),
    { initialProps: { starters } }
  );
}

describe('useInputExtensions starter memo dependencies', () => {
  it('recomputes when only isOn changes', () => {
    const { result, rerender } = renderStarters({
      items: STARTER_ITEMS,
      isOn: true,
    });
    expect(result.current.normalizedStarters.isOn).toBe(true);

    // A fresh config object carrying the same `items` reference — the shape the
    // reconciliation pass hands over once a sibling input field changes.
    rerender({ starters: { items: STARTER_ITEMS, isOn: false } });

    expect(result.current.normalizedStarters.isOn).toBe(false);
  });

  it('reuses the memo when a fresh config carries the same values', () => {
    // The dependency list deliberately excludes `starters` object identity —
    // the store hands over a fresh object whenever any sibling input field
    // changes, and keying on it is exactly #2152. Satisfying the
    // exhaustive-deps lint with `[starters]` must fail here, not in production.
    const { result, rerender } = renderStarters({
      items: STARTER_ITEMS,
      isOn: true,
    });
    const before = result.current.normalizedStarters;
    const beforeExtensions = result.current.extensions;

    rerender({ starters: { items: STARTER_ITEMS, isOn: true } });

    expect(result.current.normalizedStarters).toBe(before);
    // The prompt-line diffs this array, so its stability is what actually
    // decides whether the live editor survives.
    expect(result.current.extensions).toBe(beforeExtensions);
  });

  it('recomputes when only disableDirectSend changes', () => {
    const { result, rerender } = renderStarters({
      items: STARTER_ITEMS,
      disableDirectSend: false,
    });
    expect(result.current.normalizedStarters.disableDirectSend).toBe(false);

    rerender({ starters: { items: STARTER_ITEMS, disableDirectSend: true } });

    expect(result.current.normalizedStarters.disableDirectSend).toBe(true);
  });
});
