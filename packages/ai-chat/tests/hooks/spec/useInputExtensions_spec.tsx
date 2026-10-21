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

import React, {
  Suspense,
  startTransition,
  useLayoutEffect,
  useState,
} from 'react';
import { act, render, renderHook } from '@testing-library/react';
import type { Extension } from '@tiptap/core';
import { getBuildCarbonExtensionsIfLoaded } from '../../../src/chat/components/input/buildExtensionsLoader';

import { useInputExtensions } from '../../../src/chat/hooks/useInputExtensions';
import type {
  StartersConfig,
  TriggerSuggestionConfig,
} from '../../../src/types/config/InputConfig';

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

jest.mock('../../../src/chat/components/input/buildExtensionsLoader', () => ({
  getBuildCarbonExtensionsIfLoaded: jest.fn(),
  loadBuildCarbonExtensions: jest.fn(),
}));

it('preserves committed extension identity after a suspended transition is abandoned', async () => {
  const builder = jest.fn().mockImplementation(() => [{} as Extension]);
  jest.mocked(getBuildCarbonExtensionsIfLoaded).mockReturnValue(builder);
  const initial: TriggerSuggestionConfig = { trigger: '@', items: [] };
  const suspended: TriggerSuggestionConfig = { trigger: '#', items: [] };
  const pending = new Promise<void>(() => {});
  let changeMention: (mention: TriggerSuggestionConfig) => void;
  let refresh: () => void;
  let committed: Extension[];
  let suspendedRenderCount = 0;

  function Harness(): React.ReactElement | null {
    const [mention, setMention] = useState(initial);
    const [, setRevision] = useState(0);
    changeMention = setMention;
    refresh = () => setRevision((revision) => revision + 1);
    const { extensions } = useInputExtensions({
      mention,
      command: undefined,
      autocomplete: undefined,
      starters: undefined,
      hostExtensions: undefined,
      enabled: true,
    });
    useLayoutEffect(() => {
      committed = extensions;
    });
    if (mention === suspended) {
      suspendedRenderCount += 1;
      throw pending;
    }
    return null;
  }

  render(
    <Suspense fallback={null}>
      <Harness />
    </Suspense>
  );
  const before = committed;
  await act(async () => {
    startTransition(() => changeMention(suspended));
  });
  expect(suspendedRenderCount).toBeGreaterThan(0);
  act(() => {
    changeMention(initial);
    refresh();
  });
  expect(committed).toBe(before);
});
