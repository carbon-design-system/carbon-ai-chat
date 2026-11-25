/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Coverage for the structural-sharing passes that run on a runtime config
 * change: `reconcileAppConfigReferences` on the conversation's config, and the
 * view partition's `setDerivedConfig` on the values derived from it. A config
 * change rebuilds both trees, so without reconciliation a single-field change
 * (e.g. toggling `input.isDisabled`) would hand every `config.public.*` /
 * `view.derivedConfig.*` sub-object a fresh reference and force every
 * config-reading selector to re-render. These tests assert that value-equal
 * sub-objects keep their previous reference while genuinely-changed ones get a
 * new one.
 */

import { createDerivedConfig } from '../../../src/chat/utils/appConfig';
import { viewActions } from '../../../src/chat/state';
import { createInitialViewState } from '../../../src/chat/state/initialState';
import { viewReducer } from '../../../src/chat/state/reducer';
import { reconcileAppConfigReferences } from '../../../src/sdk/utils/reconcileConfig';
import { PublicConfig } from '../../../src/types/config/PublicConfig';
import type { ConversationState } from '../../../src/types/state/ConversationState';

/**
 * Builds a fully-formed PublicConfig with fresh object references on every call,
 * mirroring what `ChatContainer`'s `useMemo` produces each render.
 */
function buildPublicConfig(): PublicConfig {
  return {
    header: { name: 'Assistant', showRestartButton: true },
    layout: { showFrame: true },
    launcher: { isOn: true },
    input: { isDisabled: false, isVisible: true },
    homescreen: { isOn: false },
    assistantName: 'Assistant',
    locale: 'en',
  } as PublicConfig;
}

/** The conversation's config for `publicConfig`, as a config update builds it. */
function createAppConfig(publicConfig: PublicConfig) {
  return { public: publicConfig };
}

/**
 * Runs a config change through the view partition: its state starts from
 * `prevPublic`, then takes the values derived from `nextPublic`.
 */
function updateDerived(prevPublic: PublicConfig, nextPublic: PublicConfig) {
  const before = createInitialViewState(prevPublic, null);
  const after = viewReducer(
    before,
    viewActions.setDerivedConfig(createDerivedConfig(nextPublic)),
    {} as ConversationState,
    {} as ConversationState
  );
  return {
    before,
    after,
    prev: before.derivedConfig,
    reconciled: after.derivedConfig,
  };
}

describe('reconcileAppConfigReferences', () => {
  it('returns next as-is when there is no previous config (boot)', () => {
    const next = createAppConfig(buildPublicConfig());
    expect(reconcileAppConfigReferences(null, next)).toBe(next);
  });

  it('reuses every reference when nothing changed', () => {
    const prev = createAppConfig(buildPublicConfig());
    // A structurally-fresh but value-equal rebuild.
    const next = createAppConfig(buildPublicConfig());

    const reconciled = reconcileAppConfigReferences(prev, next);

    // The whole config object is reused.
    expect(reconciled).toBe(prev);
    expect(reconciled.public).toBe(prev.public);

    // So is the view's whole derived tree, and its partition: nothing reruns.
    const derived = updateDerived(buildPublicConfig(), buildPublicConfig());
    expect(derived.reconciled).toBe(derived.prev);
    expect(derived.after).toBe(derived.before);
  });

  it('preserves unrelated references when only input.isDisabled changes', () => {
    const prev = createAppConfig(buildPublicConfig());

    const nextPublic = buildPublicConfig();
    nextPublic.input = { ...nextPublic.input, isDisabled: true };
    const next = createAppConfig(nextPublic);

    const reconciled = reconcileAppConfigReferences(prev, next);

    // `input` lives under `public` and changed, so `public` must be a new object
    // carrying the new `input`...
    expect(reconciled.public).not.toBe(prev.public);
    expect(reconciled.public.input).not.toBe(prev.public.input);
    expect(reconciled.public.input?.isDisabled).toBe(true);

    // ...but every other `public.*` sub-object keeps its previous reference,
    // even though the update rebuilt them.
    expect(reconciled.public.header).toBe(prev.public.header);
    expect(reconciled.public.layout).toBe(prev.public.layout);
    expect(reconciled.public.launcher).toBe(prev.public.launcher);
    expect(reconciled.public.homescreen).toBe(prev.public.homescreen);

    // The derived tree does not depend on `input` at all, so the whole derived
    // tree is reused wholesale.
    const derived = updateDerived(buildPublicConfig(), nextPublic);
    expect(derived.reconciled).toBe(derived.prev);
  });

  it('issues a fresh derivedConfig.header (only) when the header config changes', () => {
    const nextPublic = buildPublicConfig();
    nextPublic.header = { ...nextPublic.header, name: 'Changed' };

    const { prev, reconciled } = updateDerived(buildPublicConfig(), nextPublic);

    // The changed derived sub-object gets a new reference...
    expect(reconciled).not.toBe(prev);
    expect(reconciled.header).not.toBe(prev.header);
    expect(reconciled.header.name).toBe('Changed');

    // ...while the unchanged derived siblings are preserved.
    expect(reconciled.layout).toBe(prev.layout);
    expect(reconciled.launcher).toBe(prev.launcher);
    expect(reconciled.themeWithDefaults).toBe(prev.themeWithDefaults);
    // MessagesComponent's shallowEqual selector reads this one, so a fresh identity here
    // would re-render the message list on every unrelated config change.
    expect(reconciled.keyboardShortcuts).toBe(prev.keyboardShortcuts);
  });

  it('preserves input siblings when only one input field changes', () => {
    // The prompt-line's extension memos key on `input.starters` / `input.mention`
    // identity, so an unrelated change inside `input` — an action's `disabled`
    // flag flipping as the user types — used to rebuild the extension set and
    // recreate the live editor. See issue #2152.
    const starters = { items: [{ id: 's1', label: 'Summarize' }] };
    const mention = { trigger: '@', items: [{ id: 'u1', label: 'Alice' }] };
    const onClick = (): void => undefined;
    const action = { text: 'Toggle', icon: {}, onClick };

    const prevPublic = buildPublicConfig();
    prevPublic.input = {
      ...prevPublic.input,
      starters,
      mention,
      actions: [{ ...action, disabled: false }],
    } as PublicConfig['input'];
    const prev = createAppConfig(prevPublic);

    const nextPublic = buildPublicConfig();
    nextPublic.input = {
      ...nextPublic.input,
      starters: { ...starters },
      mention: { ...mention },
      actions: [{ ...action, disabled: true }],
    } as PublicConfig['input'];
    const next = createAppConfig(nextPublic);

    const reconciled = reconcileAppConfigReferences(prev, next);

    // The genuinely-changed field lands...
    expect(reconciled.public.input).not.toBe(prev.public.input);
    expect(reconciled.public.input.actions[0].disabled).toBe(true);

    // ...while its value-equal siblings keep the references the memos compare.
    expect(reconciled.public.input.starters).toBe(prev.public.input.starters);
    expect(reconciled.public.input.mention).toBe(prev.public.input.mention);
  });

  it('does not churn value-equal sub-objects when only a function prop changes', () => {
    const basePublic = buildPublicConfig();
    const prevPublic: PublicConfig = {
      ...basePublic,
      onError: () => undefined,
    };
    const prev = createAppConfig(prevPublic);

    // Fresh rebuild with a different onError function instance (the classic
    // inline-callback churn).
    const nextPublic: PublicConfig = {
      ...buildPublicConfig(),
      onError: () => undefined,
    };
    const next = createAppConfig(nextPublic);

    const reconciled = reconcileAppConfigReferences(prev, next);

    // The function field differs by reference, so `public` is rebuilt and the
    // function is the new one...
    expect(reconciled.public).not.toBe(prev.public);
    expect(reconciled.public.onError).toBe(nextPublic.onError);

    // ...but unrelated public sub-objects and the entire derived tree (which
    // holds no functions) survive — a function-only change does not re-render
    // every config consumer.
    expect(reconciled.public.header).toBe(prev.public.header);
    expect(reconciled.public.input).toBe(prev.public.input);
    const derived = updateDerived(prevPublic, nextPublic);
    expect(derived.reconciled).toBe(derived.prev);
  });
});
