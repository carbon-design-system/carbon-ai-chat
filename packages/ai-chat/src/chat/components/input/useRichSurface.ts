/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useCallback, useEffect, useState } from "react";
import type { Extension } from "@tiptap/core";

import type {
  TriggerSuggestionConfig,
  SuggestionItem,
  AutocompleteConfig,
} from "../../../types/config/InputConfig";
import { resolvePromptLineMode } from "./promptLineMode";
import { useInputExtensions } from "../../hooks/useInputExtensions";

interface UseRichSurfaceArgs {
  mention: TriggerSuggestionConfig | undefined;
  command: TriggerSuggestionConfig | undefined;
  autocomplete: AutocompleteConfig | undefined;
  starters: SuggestionItem[] | undefined;
  hostExtensions: Extension[] | undefined;
}

/**
 * Resolves the prompt-line surface (textarea "lite" vs rich Tiptap), latches it
 * sticky, and builds the curated extension list.
 *
 * Resolve the surface from config, then latch it: once the rich Tiptap editor
 * is needed it stays for the rest of the session (sticky — matches the
 * element's own upgrade behavior, and avoids re-deriving on unrelated config
 * churn). Hosts can also force the upgrade at runtime via
 * `instance.input.getEditor()` (which drives the element directly) — `latchRich`
 * keeps React's latch in step with that.
 *
 * The latch is backed by state (not a ref) so that when the element
 * self-upgrades to the rich editor at runtime — via `instance.input.getEditor()`
 * or an `updateContent` call that stages rich content — React re-renders and
 * keeps passing `rich`/`extensions`. With a ref, a later unrelated render would
 * pass `rich={false}` and drop `extensions`, stripping them off the live editor.
 */
function useRichSurface({
  mention,
  command,
  autocomplete,
  starters,
  hostExtensions,
}: UseRichSurfaceArgs) {
  const promptLineMode = resolvePromptLineMode({
    mention,
    command,
    autocomplete,
    starters,
    // Host extensions force rich (they may add typing-driven behavior that only
    // runs in a live editor); the resolver ignores an empty list.
    tiptap: hostExtensions ? { extensions: hostExtensions } : undefined,
  });
  const [richLatched, setRichLatched] = useState(false);
  const useRichEditor = richLatched || promptLineMode === "rich";
  useEffect(() => {
    if (useRichEditor && !richLatched) {
      setRichLatched(true);
    }
  }, [useRichEditor, richLatched]);

  // Stable so it can be threaded into the imperative `ensureEditor` path without
  // re-creating the memoized `InputFunctions` object.
  const latchRich = useCallback(() => setRichLatched(true), []);

  const {
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    extensions,
  } = useInputExtensions({
    mention,
    command,
    autocomplete,
    starters,
    hostExtensions,
    enabled: useRichEditor,
  });

  return {
    useRichEditor,
    extensions,
    normalizedMention,
    normalizedCommand,
    normalizedAutocomplete,
    normalizedStarters,
    latchRich,
  };
}

export { useRichSurface };
