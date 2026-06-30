/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { useEffect, useState } from "react";
import type { Extension } from "@tiptap/core";
import type {
  TriggerSuggestionConfig,
  SuggestionItem,
  AutocompleteConfig,
} from "../../types/config/InputConfig";
import type { ToolbarAction } from "../../types/config/HeaderConfig";
import { useServiceManager } from "./useServiceManager";

interface InputConfigSlice {
  mention: TriggerSuggestionConfig | undefined;
  command: TriggerSuggestionConfig | undefined;
  autocomplete: AutocompleteConfig | undefined;
  starters: SuggestionItem[] | undefined;
  hostExtensions: Extension[] | undefined;
  isSendDisabledFromConfig: boolean;
  actions: ToolbarAction[] | undefined;
  expanded: boolean;
}

/**
 * Mirrors `config.public.input` from Redux into local state with
 * reference-equality guards on each field. Identical-ref guards keep the
 * Tiptap editor from being torn down and rebuilt on unrelated config changes.
 */
function useInputConfig(): InputConfigSlice {
  const serviceManager = useServiceManager();
  const store = serviceManager.store;

  const initial = store.getState().config.public.input;

  const [mention, setMention] = useState(() => initial?.mention);
  const [command, setCommand] = useState(() => initial?.command);
  const [autocomplete, setAutocomplete] = useState(() => initial?.autocomplete);
  const [starters, setStarters] = useState(() => initial?.starters);
  const [hostExtensions, setHostExtensions] = useState(
    () => initial?.tiptap?.extensions,
  );
  const [isSendDisabledFromConfig, setIsSendDisabledFromConfig] = useState(() =>
    Boolean(initial?.isSendDisabled),
  );
  const [actions, setActions] = useState<ToolbarAction[] | undefined>(
    () => initial?.actions,
  );
  const [expanded, setExpanded] = useState(() => Boolean(initial?.expanded));

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const next = store.getState().config.public.input;
      setMention((prev) => (prev !== next?.mention ? next?.mention : prev));
      setCommand((prev) => (prev !== next?.command ? next?.command : prev));
      setAutocomplete((prev) =>
        prev !== next?.autocomplete ? next?.autocomplete : prev,
      );
      setStarters((prev) => (prev !== next?.starters ? next?.starters : prev));
      setHostExtensions((prev) =>
        prev !== next?.tiptap?.extensions ? next?.tiptap?.extensions : prev,
      );
      setIsSendDisabledFromConfig((prev) => {
        const flag = Boolean(next?.isSendDisabled);
        return prev !== flag ? flag : prev;
      });
      setActions((prev) => (prev !== next?.actions ? next?.actions : prev));
      setExpanded((prev) => {
        const flag = Boolean(next?.expanded);
        return prev !== flag ? flag : prev;
      });
    });
    return unsubscribe;
  }, [store]);

  return {
    mention,
    command,
    autocomplete,
    starters,
    hostExtensions,
    isSendDisabledFromConfig,
    actions,
    expanded,
  };
}

export { useInputConfig };
export type { InputConfigSlice };
