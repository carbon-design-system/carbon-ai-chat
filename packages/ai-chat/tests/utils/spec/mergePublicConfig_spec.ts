/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Merge semantics of `mergePublicConfig`. The store keeps a snapshot of the
 * host's config — hosts mutate their own objects freely without reaching
 * state — while functions pass through by reference so memoized callbacks
 * stay comparable. Identity stability across updates is the reconciliation
 * pass's job; see configReferenceSharing_spec.
 */

import { createAppConfig } from '../../../src/chat/store/doCreateStore';
import {
  DEFAULT_PUBLIC_CONFIG,
  mergePublicConfig,
} from '../../../src/chat/utils/chatBoot';
import { PublicConfig } from '../../../src/types/config/PublicConfig';

const STARTER_ITEMS = [{ id: 's1', label: 'Summarize this' }];

function buildConfig(): Partial<PublicConfig> {
  return {
    messaging: { customSendMessage: () => undefined },
    input: {
      starters: { items: STARTER_ITEMS },
      actions: [{ text: 'Toggle', icon: {}, onClick: (): void => undefined }],
    },
  } as Partial<PublicConfig>;
}

describe('mergePublicConfig', () => {
  it('snapshots caller sub-objects so later host mutations stay out of the store', () => {
    // Hosts have relied on this since 1.x: config handed over is a value, not
    // a live reference. Holding by reference instead is deferred to 2.0.
    const items = [{ id: 's1', label: 'Summarize this' }];
    const config = {
      input: { starters: { items } },
    } as Partial<PublicConfig>;

    const merged = mergePublicConfig(config);
    items[0].label = 'mutated';
    config.input.starters.items = [];

    expect(merged.input.starters.items).toHaveLength(1);
    expect(merged.input.starters.items[0].label).toBe('Summarize this');
  });

  it('preserves function identity', () => {
    const config = buildConfig();
    const merged = mergePublicConfig(config);
    expect(merged.messaging.customSendMessage).toBe(
      config.messaging.customSendMessage
    );
  });

  it('applies object-valued defaults without sharing the default instances', () => {
    const first = mergePublicConfig({});
    const second = mergePublicConfig({});

    expect(first.launcher.isOn).toBe(true);
    expect(first.serviceDesk).toEqual({});
    expect(first.messaging).toEqual({});

    // Each call owns its defaulted objects, so a later write cannot leak
    // between chat instances or back into the shared default.
    expect(first.launcher).not.toBe(second.launcher);
    expect(first.launcher).not.toBe(DEFAULT_PUBLIC_CONFIG.launcher);
    expect(first.serviceDesk).not.toBe(second.serviceDesk);
  });

  it('merges launcher per key rather than replacing the default wholesale', () => {
    const merged = mergePublicConfig({
      launcher: { desktop: { title: 'Chat' } },
    } as Partial<PublicConfig>);

    expect(merged.launcher.isOn).toBe(true);
    expect((merged.launcher as { desktop: unknown }).desktop).toEqual({
      title: 'Chat',
    });
  });

  it('does not mutate the caller config or the shared defaults', () => {
    const config = buildConfig();
    const launcherDefault = { ...DEFAULT_PUBLIC_CONFIG.launcher };

    mergePublicConfig(config);

    expect(config.launcher).toBeUndefined();
    expect(config.serviceDesk).toBeUndefined();
    expect(DEFAULT_PUBLIC_CONFIG.launcher).toEqual(launcherDefault);
  });

  it('leaves the merged snapshot intact when boot rejects a Carbon token', () => {
    // A `$` token whose value is not a hex color is dropped from the derived
    // overrides, but must survive on the merged config: `ChatAppEntry` keeps that
    // object as its change-detection baseline, and a baseline missing a key every
    // fresh merge still carries compares as changed on every host render.
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const merged = mergePublicConfig({
      layout: { customProperties: { '$button-primary': 'var(--brand)' } },
    } as Partial<PublicConfig>);

    const appConfig = createAppConfig(merged);

    expect(appConfig.derived.cssVariableOverrides['$button-primary']).toBe(
      undefined
    );
    expect(merged.layout.customProperties['$button-primary']).toBe(
      'var(--brand)'
    );
    warn.mockRestore();
  });

  it('lets an explicitly-undefined field fall back to its default', () => {
    const merged = mergePublicConfig({
      assistantName: undefined,
    } as Partial<PublicConfig>);
    expect(merged.assistantName).toBe('watsonx');
  });
});
