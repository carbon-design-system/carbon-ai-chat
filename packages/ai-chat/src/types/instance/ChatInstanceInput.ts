/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { StructuredData } from "../messaging/Messages";

/**
 * Methods for controlling the input field.
 *
 * @category Instance
 */
export interface ChatInstanceInput {
  /**
   * @experimental Updates the raw text queued in the input before it is sent to customSendMessage.
   * Use this when you want to manipulate the canonical value while leaving presentation up to the default renderer or,
   * in the future, a custom slot implementation.
   *
   * @example
   * ```ts
   * instance.input.updateRawValue((prev) => `${prev} @celeste`);
   * ```
   */
  updateRawValue: (updater: (previous: string) => string) => void;

  /**
   * Updates the pending structured data that will be merged into the next outgoing {@link MessageRequest}
   * when the user sends a message via the UI send button or Enter key. The updater function receives the
   * current pending structured data (or `undefined` if none is set) and should return the new value.
   * Return `undefined` to clear the pending structured data.
   *
   * This is the primary mechanism for pushing structured inputs (form fields, file references, etc.)
   * into the active input so they are included when the user hits Send.
   *
   * @example
   * ```ts
   * // Add a field to the pending structured data
   * instance.input.updateStructuredData((prev) => ({
   *   ...prev,
   *   fields: [
   *     ...(prev?.fields ?? []),
   *     { id: 'rating', type: 'number', value: 4 }
   *   ]
   * }));
   *
   * // Replace all pending structured data
   * instance.input.updateStructuredData(() => ({
   *   fields: [{ id: 'selection', type: 'multi_select', value: ['a', 'b'] }]
   * }));
   *
   * // Clear pending structured data
   * instance.input.updateStructuredData(() => undefined);
   * ```
   *
   * @experimental
   */
  updateStructuredData: (
    updater: (
      previous: StructuredData | undefined,
    ) => StructuredData | undefined,
  ) => void;
}
