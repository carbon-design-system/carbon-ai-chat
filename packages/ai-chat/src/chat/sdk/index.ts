/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Barrel for the internal SDK facade. This is the future `@carbon/ai-chat/sdk` rollup input (not
 * wired into `package.json#exports` or `tasks/rollup.aichat.js` yet) and the root of the transitive
 * import-graph boundary spec (`tests/sdk/spec/sdkBoundary_spec.ts`). Everything reachable from here
 * must stay framework-agnostic — see `packages/ai-chat/AGENTS.md`'s "SDK boundary" note.
 */

export { ChatSDK, acquireChatSDK } from "./ChatSDK.js";
export type { ChatSDKHost } from "./ChatSDK.js";

export { attachSlotStateTracking } from "./slotStates.js";
export type { ChatSlotStates } from "./slotStates.js";

export { createValueStore } from "./valueStore.js";
export type { ReadableValueStore, ValueStore } from "./valueStore.js";
