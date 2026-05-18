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
  InputMenuOption,
} from "../../types/config/InputConfig";
import { useServiceManager } from "./useServiceManager";

interface InputConfigSlice {
  mention: TriggerSuggestionConfig | undefined;
  command: TriggerSuggestionConfig | undefined;
  autocomplete: AutocompleteConfig | undefined;
  starters: SuggestionItem[] | undefined;
  hostExtensions: Extension[] | undefined;
  isSendDisabledFromConfig: boolean;
  menuOptions: InputMenuOption[] | undefined;
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
  const [menuOptions, setMenuOptions] = useState<InputMenuOption[] | undefined>(
    () => initial?.menuOptions,
  );

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
      setMenuOptions((prev) =>
        prev !== next?.menuOptions ? next?.menuOptions : prev,
      );
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
    menuOptions,
  };
}

export { useInputConfig };
export type { InputConfigSlice };
