/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Value-level equivalence for the extension list handed to
 * `<cds-aichat-prompt-line>`, so a host config update that says the same thing
 * does not recreate the live editor (which resets undo history).
 *
 * The built Tiptap instances cannot be compared directly: `carbonAutocomplete`
 * and `carbonStarterTrigger` capture their config in closures, leaving
 * `.options` empty (two different item lists would compare equal), while
 * `carbonMention` / `carbonCommand` install fresh function identities on every
 * `.configure()` (identical configs would compare unequal). So each factory
 * output is tagged here with the source config it was built from, and
 * equivalence compares those configs instead.
 *
 * Only the appended list is compared. The base bundle (schema, undo/redo,
 * placeholder, keymap, value-sync, ...) is constructed inside the rich runtime
 * and never reaches this module.
 */

import type { Extension } from '@tiptap/core';
import isEqual from 'lodash-es/isEqual.js';

import type {
  AutocompleteConfig,
  StartersConfig,
  TriggerSuggestionConfig,
} from './types.js';

/** Which carbon factory produced an extension. */
export type ExtensionSourceKind =
  'mention' | 'command' | 'autocomplete' | 'starters';

/** The config an extension was built from, recorded at build time. */
export interface ExtensionSourceDescriptor {
  kind: ExtensionSourceKind;
  config:
    TriggerSuggestionConfig | AutocompleteConfig | StartersConfig | undefined;
}

const EXTENSION_SOURCE: unique symbol = Symbol.for(
  'cds-aichat.prompt-line.extension-source'
);

/**
 * Record the source config on a built extension. Returns the same instance so
 * factories can tag inline.
 */
export function tagExtensionSource<T>(
  extension: T,
  descriptor: ExtensionSourceDescriptor
): T {
  (extension as Record<symbol, unknown>)[EXTENSION_SOURCE] = descriptor;
  return extension;
}

/** Read back a descriptor, or `undefined` for host-supplied extensions. */
export function getExtensionSource(
  extension: unknown
): ExtensionSourceDescriptor | undefined {
  if (!extension || typeof extension !== 'object') {
    return undefined;
  }
  return (extension as Record<symbol, unknown>)[EXTENSION_SOURCE] as
    ExtensionSourceDescriptor | undefined;
}

/**
 * Whether two extension lists install the same editor behavior.
 *
 * Compared positionally — extension order is ProseMirror plugin order, so a
 * reordered list is a genuinely different editor and never reorder-matched.
 *
 * Per pair:
 * - Same instance wins outright. This is the only rule available for
 *   host-supplied extensions, whose documented contract already asks hosts to
 *   memoize them.
 * - Two carbon extensions of the same kind compare their source configs by
 *   value, with functions compared by reference (lodash `isEqual` semantics) —
 *   a host that rebuilds its callbacks each render genuinely gets a new editor,
 *   same as before.
 * - Starter triggers are always equivalent: every difference they can carry
 *   (`items`, `isOn`) is applied to the live editor's storage instead. See
 *   `RichController.setExtensions`. `buildCarbonExtensions` installs the
 *   extension for an empty list too, so emptying `items` stays a storage write
 *   instead of a length change that rejects the pair before this rule is
 *   reached.
 */
export function areExtensionSetsEquivalent(
  previous: readonly Extension[],
  next: readonly Extension[]
): boolean {
  if (previous === next) {
    return true;
  }
  if (previous.length !== next.length) {
    return false;
  }
  return previous.every((prevExtension, index) =>
    isExtensionEquivalent(prevExtension, next[index])
  );
}

function isExtensionEquivalent(previous: Extension, next: Extension): boolean {
  if (previous === next) {
    return true;
  }
  const prevSource = getExtensionSource(previous);
  const nextSource = getExtensionSource(next);
  if (!prevSource || !nextSource || prevSource.kind !== nextSource.kind) {
    return false;
  }
  if (prevSource.kind === 'starters') {
    return true;
  }
  return isEqual(prevSource.config, nextSource.config);
}
