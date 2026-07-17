/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * The shipped chat app's boot pipeline: host-container styling, public-config defaults, and the
 * accidental-remount diagnostic. Deliberately OUTSIDE `src/chat/sdk/` — these are things the app's
 * shells (React today, a Lit shell later) run around `acquireChatSDK`, not part of the headless
 * SDK surface: a consumer composing their own chat from `@carbon/ai-chat-components` elements has
 * no boot container, no launcher defaults, and no React remount semantics.
 */

import merge from "lodash-es/merge.js";

import { setVarsForSelector } from "@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js";

import { consoleWarn } from "../utils/miscUtils";
import { PublicConfig } from "../../types/config/PublicConfig";

let bootContainerRulesInstalled = false;

/**
 * Per-namespace boot diagnostics for the accidental-remount warning. Tracks the last cold-boot time
 * (to suppress React StrictMode's rapid dev double-boot) and whether we have already warned.
 */
const bootDiagnosticsByNamespace = new Map<
  string,
  { warned: boolean; lastBootMs: number }
>();
const STRICTMODE_WINDOW_MS = 50;

/**
 * Install boot-container size rules on the shared dynamic stylesheet so a
 * strict CSP can drop style-src-attr 'unsafe-inline'. The container fills
 * the host element when one is provided and otherwise stays collapsed
 * (0×0) until the chat floats out.
 */
function ensureBootContainerStyleRules(): void {
  if (bootContainerRulesInstalled) {
    return;
  }
  setVarsForSelector(".cds-aichat--boot-container--filled", {
    width: "100% !important",
    height: "100% !important",
  });
  setVarsForSelector(".cds-aichat--boot-container--collapsed", {
    width: "0 !important",
    height: "0 !important",
  });
  bootContainerRulesInstalled = true;
}

/**
 * Applies the boot-container CSS classes to the host container. The shell runs this after every
 * acquire — cold boot and reuse re-attach alike — so a reused manager's new container gets the
 * same sizing rules.
 */
export function applyBootContainerClasses(
  container: HTMLElement,
  hasCustomHostElement: boolean,
): void {
  ensureBootContainerStyleRules();
  container.classList.add("cds-aichat--boot-container");
  container.classList.toggle(
    "cds-aichat--boot-container--filled",
    hasCustomHostElement,
  );
  container.classList.toggle(
    "cds-aichat--boot-container--collapsed",
    !hasCustomHostElement,
  );
}

/**
 * Emits a one-time, debug-gated warning when a namespace cold-boots a second time — a sign the host
 * unmounted and remounted the chat (React StrictMode, a changing `key`, a component defined inside
 * render, or conditional rendering), which discards the conversation. Suppressed when
 * `featureFlags.reuseInstance` is enabled (a remount then reuses the instance) and within a short
 * window after the previous boot (to ignore React StrictMode's rapid dev double-boot). The shell
 * calls this once per cold boot.
 */
export function maybeWarnAccidentalReboot(publicConfig: PublicConfig): void {
  const namespace = publicConfig.namespace ?? "";
  const now = Date.now();
  const prior = bootDiagnosticsByNamespace.get(namespace);

  const shouldWarn =
    prior !== undefined &&
    !prior.warned &&
    now - prior.lastBootMs > STRICTMODE_WINDOW_MS &&
    Boolean(publicConfig.debug) &&
    !publicConfig.featureFlags?.reuseInstance;

  bootDiagnosticsByNamespace.set(namespace, {
    warned: (prior?.warned ?? false) || shouldWarn,
    lastBootMs: now,
  });

  if (shouldWarn) {
    consoleWarn(
      `Carbon AI Chat re-initialized from scratch for namespace "${namespace}", discarding the ` +
        "conversation. Its host element was unmounted and remounted (React StrictMode, a changing " +
        "`key`, a component defined inside render, or conditional rendering). Mount the chat once " +
        "and keep it mounted — toggle visibility with CSS or the view API. To make a remount reuse " +
        "the existing conversation, set `featureFlags.reuseInstance: true`.",
    );
  }
}

/**
 * Default values applied to the provided `PublicConfig` before boot. This keeps
 * the rest of the boot pipeline free from null checks for optional config
 * branches. Callers can override any of these via the incoming partial config.
 */
export const DEFAULT_PUBLIC_CONFIG: Partial<PublicConfig> = {
  assistantName: "watsonx",
  openChatByDefault: false,
  shouldTakeFocusIfOpensAutomatically: true,
  serviceDesk: {},
  messaging: {},
  launcher: {
    isOn: true,
  },
};

/**
 * Merges a user-supplied partial config with {@link DEFAULT_PUBLIC_CONFIG} to
 * produce a complete `PublicConfig`. The shell merges before calling
 * `acquireChatSDK`, which expects the already-merged config.
 */
export function mergePublicConfig(config: Partial<PublicConfig>): PublicConfig {
  return merge({}, DEFAULT_PUBLIC_CONFIG, config) as PublicConfig;
}
