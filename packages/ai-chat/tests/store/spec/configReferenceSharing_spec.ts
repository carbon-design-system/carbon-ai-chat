/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Coverage for `reconcileAppConfigReferences`, the structural-sharing pass that
 * runs after `createAppConfig` on a runtime config change. `createAppConfig`
 * always rebuilds the entire `AppConfig` tree, so without reconciliation a
 * single-field change (e.g. toggling `input.isDisabled`) would hand every
 * `config.public.*` / `config.derived.*` sub-object a fresh reference and force
 * every config-reading selector to re-render. These tests assert that
 * value-equal sub-objects keep their previous reference while genuinely-changed
 * ones get a new one.
 */

import {
  createAppConfig,
  reconcileAppConfigReferences,
} from "../../../src/chat/store/doCreateStore";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

/**
 * Builds a fully-formed PublicConfig with fresh object references on every call,
 * mirroring what `ChatContainer`'s `useMemo` produces each render.
 */
function buildPublicConfig(): PublicConfig {
  return {
    header: { name: "Assistant", showRestartButton: true },
    layout: { showFrame: true },
    launcher: { isOn: true },
    input: { isDisabled: false, isVisible: true },
    homescreen: { isOn: false },
    assistantName: "Assistant",
    locale: "en",
  } as PublicConfig;
}

describe("reconcileAppConfigReferences", () => {
  it("returns next as-is when there is no previous config (boot)", () => {
    const next = createAppConfig(buildPublicConfig());
    expect(reconcileAppConfigReferences(null, next)).toBe(next);
  });

  it("reuses every reference when nothing changed", () => {
    const prev = createAppConfig(buildPublicConfig());
    // A structurally-fresh but value-equal rebuild.
    const next = createAppConfig(buildPublicConfig());

    const reconciled = reconcileAppConfigReferences(prev, next);

    // The whole config object is reused.
    expect(reconciled).toBe(prev);
    expect(reconciled.public).toBe(prev.public);
    expect(reconciled.derived).toBe(prev.derived);
  });

  it("preserves unrelated references when only input.isDisabled changes", () => {
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
    // even though `createAppConfig` rebuilt them.
    expect(reconciled.public.header).toBe(prev.public.header);
    expect(reconciled.public.layout).toBe(prev.public.layout);
    expect(reconciled.public.launcher).toBe(prev.public.launcher);
    expect(reconciled.public.homescreen).toBe(prev.public.homescreen);

    // `derived` does not depend on `input` at all, so the whole derived tree is
    // reused wholesale.
    expect(reconciled.derived).toBe(prev.derived);
  });

  it("issues a fresh derived.header (only) when the header config changes", () => {
    const prev = createAppConfig(buildPublicConfig());

    const nextPublic = buildPublicConfig();
    nextPublic.header = { ...nextPublic.header, name: "Changed" };
    const next = createAppConfig(nextPublic);

    const reconciled = reconcileAppConfigReferences(prev, next);

    // The changed derived sub-object gets a new reference...
    expect(reconciled.derived).not.toBe(prev.derived);
    expect(reconciled.derived.header).not.toBe(prev.derived.header);
    expect(reconciled.derived.header.name).toBe("Changed");

    // ...while the unchanged derived siblings are preserved.
    expect(reconciled.derived.layout).toBe(prev.derived.layout);
    expect(reconciled.derived.launcher).toBe(prev.derived.launcher);
    expect(reconciled.derived.themeWithDefaults).toBe(
      prev.derived.themeWithDefaults,
    );
  });

  it("does not churn value-equal sub-objects when only a function prop changes", () => {
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
    expect(reconciled.derived).toBe(prev.derived);
  });
});
