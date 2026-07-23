/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Completeness guard for the runtime config fan-in.
 *
 * Applying a `PublicConfig` change at runtime takes one of two paths:
 *  - the reactive backbone — the wholesale config replace in
 *    `applyConfigChangesDynamically` plus the selectors that read it; or
 *  - an explicit out-of-store side effect — a per-field block in
 *    `applyConfigChangesDynamically`, or the `refreshLocalizationOnChange`
 *    store subscription for strings/locale.
 *
 * Every field must be deliberately assigned to one path. `PublicConfig` is the
 * source of truth via the compile-time-exhaustive `FLATTENED_PUBLIC_CONFIG_FIELDS`
 * table, so adding a field there fails this test until it is classified below —
 * forcing the author to decide whether it needs side-effect handling rather than
 * silently relying on the backbone (the gap that left web-component `strings`
 * and runtime locale changes unhandled).
 */

import { FLATTENED_PUBLIC_CONFIG_FIELDS } from "../../../src/web-components/shared/flattenedPublicConfig";

/**
 * Fields with an explicit out-of-store side effect. Keep in sync with the per-field
 * blocks in `src/chat/utils/dynamicConfigUpdates.ts` and the
 * `refreshLocalizationOnChange` subscription in `src/chat/store/subscriptions.ts`.
 */
const SIDE_EFFECT_FIELDS = new Set<string>([
  "strings", // languagePack slice rebuild + intl via the localization subscription
  "locale", // intl + dayjs rebuild via the localization subscription
  "homescreen", // open/close state transition
  "namespace", // ServiceManager.namespace swap
  "messaging", // messageTimeoutSecs -> messageService.timeoutMS
  "serviceDeskFactory", // human-agent service rebuild
  "disclaimer", // clears recorded acceptance when content changes
  "launcher", // showUnreadIndicator persisted runtime state
]);

/**
 * Fields fully applied by the config replace + reactive selector reads — no extra
 * work needed at the dynamic-update site.
 */
const REACTIVE_BACKBONE_FIELDS = new Set<string>([
  "onError",
  "openChatByDefault",
  "disableCustomElementMobileEnhancements",
  "debug",
  "exposeServiceManagerForTesting",
  "injectCarbonTheme",
  "aiEnabled",
  "serviceDesk",
  "shouldTakeFocusIfOpensAutomatically",
  "shouldSanitizeHTML",
  "header",
  "history",
  "layout",
  "isReadonly",
  "persistFeedback",
  "hideAvatar",
  "assistantName",
  "assistantAvatarUrl",
  "input",
  "upload",
  "keyboardShortcuts",
  "markdown",
  "persistedState",
  "featureFlags",
]);

const ALL_FIELDS = FLATTENED_PUBLIC_CONFIG_FIELDS.map((field) => field.name);

describe("PublicConfig runtime fan-in completeness", () => {
  it("classifies every PublicConfig field as side-effect or reactive-backbone", () => {
    const classified = new Set([
      ...SIDE_EFFECT_FIELDS,
      ...REACTIVE_BACKBONE_FIELDS,
    ]);
    const unclassified = ALL_FIELDS.filter((name) => !classified.has(name));
    expect(unclassified).toEqual([]);
  });

  it("does not classify a field as both side-effect and reactive-backbone", () => {
    const overlap = [...SIDE_EFFECT_FIELDS].filter((name) =>
      REACTIVE_BACKBONE_FIELDS.has(name),
    );
    expect(overlap).toEqual([]);
  });

  it("only references fields that exist on PublicConfig", () => {
    const known = new Set<string>(ALL_FIELDS);
    const referenced = [...SIDE_EFFECT_FIELDS, ...REACTIVE_BACKBONE_FIELDS];
    const unknown = referenced.filter((name) => !known.has(name));
    expect(unknown).toEqual([]);
  });
});
