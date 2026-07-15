/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Single source of truth for the {@link PublicConfig} fields that the
 * `cds-aichat-container` and `cds-aichat-custom-element` web components expose
 * as flattened top-level attributes/properties.
 *
 * Both components build their Lit reactive properties and reconstruct a
 * `PublicConfig` from this one table, so every config field is declared in
 * exactly one place. Adding a field to {@link PublicConfig} requires adding a
 * single entry here — the compile-time guard at the bottom of this file fails
 * the build until that happens.
 */

import type { ComplexAttributeConverter, PropertyDeclaration } from "lit";

import { PublicConfig } from "../../types/config/PublicConfig";

/**
 * A single flattened-config field: a {@link PublicConfig} key plus the exact
 * Lit property options used to expose it on the web components.
 */
export interface FlattenedConfigFieldEntry {
  /** The {@link PublicConfig} key this entry maps to. */
  readonly name: keyof PublicConfig;
  /** The Lit property declaration options for this field. */
  readonly options: PropertyDeclaration;
  /**
   * When true, {@link resolveFlattenedConfig} skips this field in its generic
   * loop because its resolution rule is non-uniform. Only `aiEnabled` uses
   * this — it is resolved together with the synthetic `aiDisabled` opt-out.
   */
  readonly resolveManually?: boolean;
}

/**
 * Custom converter for the `ai-enabled` attribute so HTML authors can write
 * `ai-enabled="false" | "0" | "off" | "no"`, while an absent attribute stays
 * `undefined` (so defaults apply further down the stack).
 */
const aiEnabledConverter: ComplexAttributeConverter<boolean | undefined> = {
  fromAttribute: (value: string | null) => {
    if (value === null) {
      return undefined; // attribute absent -> leave undefined to use defaults
    }
    const v = String(value).trim().toLowerCase();
    const falsey = v === "false" || v === "0" || v === "off" || v === "no";
    // Any presence that's not an explicit falsey string is treated as true.
    return !falsey;
  },
};

/**
 * Every {@link PublicConfig} field exposed as a flattened attribute/property
 * on the web components, with the exact Lit property options for each.
 *
 * `as const satisfies` keeps the `name` values as string literals (required by
 * the exhaustiveness guard below) while type-checking every entry.
 */
export const FLATTENED_PUBLIC_CONFIG_FIELDS = [
  { name: "onError", options: { attribute: false } },
  {
    name: "openChatByDefault",
    options: { type: Boolean, attribute: "open-chat-by-default" },
  },
  { name: "disclaimer", options: { type: Object } },
  {
    name: "disableCustomElementMobileEnhancements",
    options: {
      type: Boolean,
      attribute: "disable-custom-element-mobile-enhancements",
    },
  },
  { name: "debug", options: { type: Boolean } },
  {
    name: "exposeServiceManagerForTesting",
    options: { type: Boolean, attribute: "expose-service-manager-for-testing" },
  },
  {
    name: "injectCarbonTheme",
    options: { type: String, attribute: "inject-carbon-theme" },
  },
  {
    name: "aiEnabled",
    options: { attribute: "ai-enabled", converter: aiEnabledConverter },
    resolveManually: true,
  },
  { name: "serviceDeskFactory", options: { attribute: false } },
  {
    name: "serviceDesk",
    options: { type: Object, attribute: "service-desk" },
  },
  {
    name: "shouldTakeFocusIfOpensAutomatically",
    options: {
      type: Boolean,
      attribute: "should-take-focus-if-opens-automatically",
    },
  },
  { name: "namespace", options: { type: String } },
  {
    name: "shouldSanitizeHTML",
    options: { type: Boolean, attribute: "should-sanitize-html" },
  },
  { name: "header", options: { type: Object } },
  { name: "history", options: { type: Object } },
  // Carries the onStateChange callback, so it is property-only (no attribute).
  { name: "persistedState", options: { attribute: false, type: Object } },
  { name: "layout", options: { type: Object } },
  { name: "messaging", options: { type: Object } },
  { name: "isReadonly", options: { type: Boolean, attribute: "is-readonly" } },
  {
    name: "persistFeedback",
    options: { type: Boolean, attribute: "persist-feedback" },
  },
  {
    name: "hideAvatar",
    options: { type: Boolean, attribute: "hide-avatar" },
  },
  {
    name: "assistantName",
    options: { type: String, attribute: "assistant-name" },
  },
  // Note: no explicit `attribute` — Lit derives `assistantavatarurl`.
  { name: "assistantAvatarUrl", options: { type: String } },
  { name: "locale", options: { type: String } },
  { name: "homescreen", options: { type: Object } },
  { name: "launcher", options: { type: Object } },
  { name: "input", options: { type: Object } },
  { name: "upload", options: { attribute: false, type: Object } },
  { name: "strings", options: { type: Object } },
  { name: "keyboardShortcuts", options: { type: Object } },
  { name: "markdown", options: { attribute: false } },
] as const satisfies readonly FlattenedConfigFieldEntry[];

/**
 * The shape consumed by {@link resolveFlattenedConfig}: any flattened
 * {@link PublicConfig} field, plus the base `config` object and the synthetic
 * `aiDisabled` opt-out. Both web components structurally satisfy this.
 */
export interface FlattenedConfigSource extends Partial<PublicConfig> {
  /** Base config object; flattened fields override individual keys on it. */
  config?: PublicConfig;
  /** Synthetic opt-out attribute; when true it forces `aiEnabled` to false. */
  aiDisabled?: boolean;
}

/**
 * Builds a {@link PublicConfig} from a flattened source by layering each
 * defined flattened field over the base `config` object.
 *
 * Pure and DOM-free so it can be unit tested directly.
 *
 * @param source - The web component (or any object) carrying flattened fields.
 * @returns The reconstructed `PublicConfig`.
 */
export function resolveFlattenedConfig(
  source: FlattenedConfigSource,
): PublicConfig {
  const resolved: PublicConfig = { ...(source.config ?? {}) };

  for (const field of FLATTENED_PUBLIC_CONFIG_FIELDS) {
    // aiEnabled is resolved together with aiDisabled below.
    if ("resolveManually" in field && field.resolveManually) {
      continue;
    }
    const value = source[field.name];
    if (value !== undefined) {
      (resolved as Record<string, unknown>)[field.name] = value;
    }
  }

  // aiEnabled / aiDisabled precedence is non-uniform: an explicit aiDisabled
  // attribute always wins over ai-enabled.
  if (source.aiDisabled === true) {
    resolved.aiEnabled = false;
  } else if (source.aiEnabled !== undefined) {
    resolved.aiEnabled = source.aiEnabled;
  }

  return resolved;
}

/**
 * Compile-time exhaustiveness guard.
 *
 * `_AssertTableCoversPublicConfig` fails to compile unless the set of field
 * names in {@link FLATTENED_PUBLIC_CONFIG_FIELDS} is exactly `keyof
 * PublicConfig`. Adding a field to {@link PublicConfig} without adding it to
 * the table — or vice versa — breaks the build here.
 */
type Equals<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2
    ? true
    : false;
type Expect<T extends true> = T;
type FlattenedFieldName =
  (typeof FLATTENED_PUBLIC_CONFIG_FIELDS)[number]["name"];

// The `_` prefix matches the lint config's varsIgnorePattern; this alias only
// exists to be type-checked.
type _AssertTableCoversPublicConfig = Expect<
  Equals<FlattenedFieldName, keyof PublicConfig>
>;
