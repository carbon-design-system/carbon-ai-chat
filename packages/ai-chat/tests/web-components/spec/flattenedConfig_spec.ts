/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Regression coverage for the shared flattened-`PublicConfig` surface of the
 * `cds-aichat-container` and `cds-aichat-custom-element` web components
 * (issue #1381).
 *
 * The single `FLATTENED_PUBLIC_CONFIG_FIELDS` table drives both the Lit
 * reactive `@property` declarations and the `resolvedConfig` reconstruction,
 * so each config field is wired in exactly one place. These tests guarantee
 * that:
 *  - every flattened field round-trips into the resolved config;
 *  - both web components register every field as a reactive property;
 *  - the `history` drop bug and the `ai-enabled`/`ai-disabled` precedence
 *    stay fixed.
 *
 * A compile-time exhaustiveness guard in `flattenedPublicConfig.ts`
 * additionally fails the build if a `PublicConfig` field is ever added without
 * a matching table entry.
 */

import {
  FLATTENED_PUBLIC_CONFIG_FIELDS,
  FlattenedConfigSource,
  resolveFlattenedConfig,
} from "../../../src/web-components/shared/flattenedPublicConfig";
import { PublicConfig } from "../../../src/types/config/PublicConfig";

import "../../../src/web-components/cds-aichat-container";
import "../../../src/web-components/cds-aichat-custom-element";

/**
 * Flattened fields resolved by the generic loop — everything except
 * `aiEnabled`, whose resolution is the non-uniform `aiEnabled`/`aiDisabled`
 * precedence and is covered separately.
 */
const GENERIC_FIELD_NAMES = FLATTENED_PUBLIC_CONFIG_FIELDS.filter(
  (field) => !("resolveManually" in field && field.resolveManually),
).map((field) => field.name);

/** A unique reference value for a field, so round-trips can assert identity. */
function sentinelFor(name: string): { __flattenedConfigSentinel: string } {
  return { __flattenedConfigSentinel: name };
}

/** Builds a `FlattenedConfigSource` carrying a single flattened field. */
function sourceWith(
  name: keyof PublicConfig,
  value: unknown,
): FlattenedConfigSource {
  const source: FlattenedConfigSource = {};
  (source as Record<string, unknown>)[name] = value;
  return source;
}

describe("FLATTENED_PUBLIC_CONFIG_FIELDS", () => {
  it("declares each PublicConfig field exactly once", () => {
    const names = FLATTENED_PUBLIC_CONFIG_FIELDS.map((field) => field.name);
    expect(new Set(names).size).toBe(names.length);
  });
});

describe("resolveFlattenedConfig", () => {
  it.each(GENERIC_FIELD_NAMES)(
    "round-trips the flattened %s field into the resolved config",
    (name) => {
      const sentinel = sentinelFor(name);
      const resolved = resolveFlattenedConfig(sourceWith(name, sentinel));
      expect(resolved[name]).toBe(sentinel);
    },
  );

  it("resolves the history field (regression: dropped before #1381)", () => {
    const history = { isOn: true };
    expect(resolveFlattenedConfig({ history }).history).toBe(history);
  });

  describe("previously React-divergent fields fold into config", () => {
    // strings, markdown, serviceDesk, and serviceDeskFactory used to be held out
    // of the React `config` and passed to the core as side-channel props. They
    // must now fold into `config` on both surfaces (via this shared function) so
    // the two reconstructions cannot drift again.
    it.each(["strings", "markdown", "serviceDesk", "serviceDeskFactory"])(
      "folds %s into the resolved config",
      (name) => {
        const sentinel = sentinelFor(name);
        expect(
          resolveFlattenedConfig(
            sourceWith(name as keyof PublicConfig, sentinel),
          )[name as keyof PublicConfig],
        ).toBe(sentinel);
      },
    );
  });

  it("layers flattened fields over the base config object", () => {
    const base: PublicConfig = { namespace: "from-config", debug: false };
    const resolved = resolveFlattenedConfig({ config: base, debug: true });
    // An untouched base key survives.
    expect(resolved.namespace).toBe("from-config");
    // A defined flattened field overrides the matching base key.
    expect(resolved.debug).toBe(true);
  });

  it("returns a fresh object and ignores undefined flattened fields", () => {
    const base: PublicConfig = { namespace: "from-config" };
    const resolved = resolveFlattenedConfig({ config: base });
    expect(resolved).toEqual(base);
    expect(resolved).not.toBe(base);
  });

  describe("aiEnabled / aiDisabled precedence", () => {
    it("passes aiEnabled through when aiDisabled is unset", () => {
      expect(resolveFlattenedConfig({ aiEnabled: true }).aiEnabled).toBe(true);
      expect(resolveFlattenedConfig({ aiEnabled: false }).aiEnabled).toBe(
        false,
      );
    });

    it("forces aiEnabled to false when aiDisabled is true", () => {
      expect(resolveFlattenedConfig({ aiDisabled: true }).aiEnabled).toBe(
        false,
      );
      expect(
        resolveFlattenedConfig({ aiDisabled: true, aiEnabled: true }).aiEnabled,
      ).toBe(false);
    });

    it("leaves aiEnabled absent when neither is set", () => {
      expect("aiEnabled" in resolveFlattenedConfig({})).toBe(false);
    });
  });
});

describe.each(["cds-aichat-container", "cds-aichat-custom-element"])(
  "%s flattened PublicConfig surface",
  (tagName) => {
    it("registers every flattened field as a reactive property", () => {
      const element = document.createElement(tagName) as any;
      const { elementProperties } = element.constructor;
      for (const field of FLATTENED_PUBLIC_CONFIG_FIELDS) {
        expect(elementProperties.has(field.name)).toBe(true);
      }
      // Synthetic properties that are not PublicConfig fields.
      expect(elementProperties.has("config")).toBe(true);
      expect(elementProperties.has("aiDisabled")).toBe(true);
    });

    it.each(GENERIC_FIELD_NAMES)(
      "round-trips the %s property into resolvedConfig",
      (name) => {
        const element = document.createElement(tagName) as any;
        const sentinel = sentinelFor(name);
        element[name] = sentinel;
        expect(element.resolvedConfig[name]).toBe(sentinel);
      },
    );

    it("round-trips the history property (regression)", () => {
      const element = document.createElement(tagName) as any;
      const history = { isOn: true };
      element.history = history;
      expect(element.resolvedConfig.history).toBe(history);
    });

    it("lets ai-disabled override ai-enabled", () => {
      const element = document.createElement(tagName) as any;
      element.aiEnabled = true;
      element.aiDisabled = true;
      expect(element.resolvedConfig.aiEnabled).toBe(false);
    });

    it("converts the ai-enabled attribute via the shared converter", () => {
      const element = document.createElement(tagName) as any;
      element.setAttribute("ai-enabled", "off");
      expect(element.aiEnabled).toBe(false);
      element.setAttribute("ai-enabled", "true");
      expect(element.aiEnabled).toBe(true);
      // A removed attribute resolves back to undefined so config defaults apply.
      element.removeAttribute("ai-enabled");
      expect(element.aiEnabled).toBeUndefined();
    });
  },
);
