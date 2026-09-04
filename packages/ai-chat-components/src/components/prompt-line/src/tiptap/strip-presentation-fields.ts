/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Drops the fields a chip renders from its own attrs, leaving only the host's
 * custom fields. Used by AutocompleteController at insert time to fill the
 * token node's `data` attr, so `onRemove` can hand those fields back.
 */

import type { SuggestionItem } from './types.js';

export function stripPresentationFields(
  item: SuggestionItem
): Record<string, unknown> {
  const {
    id: _id,
    label: _label,
    value: _value,
    avatar: _avatar,
    description: _description,
    disabled: _disabled,
    showTriggerInChip: _showTriggerInChip,
    ...rest
  } = item;
  void _id;
  void _label;
  void _value;
  void _avatar;
  void _description;
  void _disabled;
  void _showTriggerInChip;
  return rest;
}
