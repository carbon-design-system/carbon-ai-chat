/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Core-local re-export of the framework-agnostic `uuid` helper. The canonical implementation is an
 * import-free leaf in `@carbon/ai-chat-components`; routing it through this deliberately-unfenced
 * `utils/` module lets the framework-agnostic SDK dirs (`services/`, `store/`, `schema/`, …) mint
 * IDs without naming the component package directly (the per-file eslint fence bans that; see the
 * "SDK boundary" note in the package AGENTS.md). Framework-freeness is enforced transitively by
 * `tests/sdk/spec/sdkBoundary_spec.ts`. Mirrors the `browser-utils` re-export in `browserUtils.ts`.
 */
export { uuid } from "@carbon/ai-chat-components/es/globals/utils/uuid.js";
