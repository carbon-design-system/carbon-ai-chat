/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import isEqual from 'lodash-es/isEqual.js';

/**
 * Shallow-reconciles `next` against `prev` one level deep: any own key whose
 * value is deep-equal to the previous value reuses the previous reference. If
 * every key ends up reused and the key set is unchanged, the previous object is
 * returned wholesale so its reference survives too.
 *
 * Functions are compared by reference (lodash `isEqual` semantics), so a field
 * carrying a changed callback is treated as changed.
 *
 * Comparison is by value, not identity: two distinct but deep-equal instances
 * (a `Date`, `Map`, `Set`, or class instance with equal contents) are treated as
 * unchanged and the previous reference is reused. That is fine for the current
 * config shape (plain data + functions); if a field is ever added whose identity
 * matters beyond its value, it must not rely on this for change detection.
 *
 * Workload: called only on a runtime config replace (rare), with `prev`/`next`
 * being the public config, or the values the prebuilt chat derives from it —
 * tens of keys at the top level. The per-key `isEqual` deep walk is acceptable at that scale; if a
 * field is ever added whose sub-tree is large (e.g. a big lookup table), revisit.
 */
function reconcileObjectReferences<T extends object>(prev: T, next: T): T {
  if (!prev || prev === next) {
    return next;
  }

  const nextKeys = Object.keys(next);
  const prevKeys = Object.keys(prev);
  let allReused = nextKeys.length === prevKeys.length;

  const result: Record<string, unknown> = {};
  for (const key of nextKeys) {
    const nextValue = (next as Record<string, unknown>)[key];
    const prevValue = (prev as Record<string, unknown>)[key];
    if (
      Object.prototype.hasOwnProperty.call(prev, key) &&
      isEqual(prevValue, nextValue)
    ) {
      result[key] = prevValue;
    } else {
      result[key] = nextValue;
      allReused = false;
    }
  }

  return allReused ? prev : (result as T);
}

/**
 * Preserves object references for the parts of `next` that are value-equal to
 * `prev`, so a config change that only touches one field (e.g. toggling
 * `input.isDisabled`) does not hand every `config.public.*` sub-object — nor
 * the `public` / top-level `config` objects themselves — a fresh reference.
 * Selectors that read an unchanged sub-object then keep their identity and skip
 * re-rendering. The prebuilt chat's derived values get the same one-level pass
 * in its view partition.
 *
 * A config update builds a whole new config, so call this on it (against the
 * previously stored config) before dispatching the replace. At boot there is no
 * previous config; pass `null` and `next` is returned as-is.
 *
 * Reconciliation is one level deep, with `public.input` the single deliberate
 * exception — see the comment at that call. Everything else stays all-or-nothing
 * per top-level key.
 */
function reconcileAppConfigReferences<C extends { public: { input?: object } }>(
  prev: C | null | undefined,
  next: C
): C {
  if (!prev) {
    return next;
  }

  const publicConfig = reconcileObjectReferences(prev.public, next.public);

  // `input` is the one key reconciled a second level down. It is the only slot
  // whose siblings are consumed as memo dependencies, so an unrelated change
  // inside it (an action's `disabled` flag flipping as the user types) would
  // otherwise hand `input.starters` / `input.mention` / `input.tiptap` fresh
  // references and rebuild the prompt-line's extensions for nothing.
  if (
    prev.public.input &&
    publicConfig.input &&
    publicConfig.input !== prev.public.input
  ) {
    publicConfig.input = reconcileObjectReferences(
      prev.public.input,
      publicConfig.input
    );
  }

  if (publicConfig === prev.public) {
    return prev;
  }

  return { ...next, public: publicConfig };
}

export { reconcileAppConfigReferences, reconcileObjectReferences };
