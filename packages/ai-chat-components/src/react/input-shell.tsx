/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { createComponent } from "@lit/react";
import React from "react";

import InputShellElement from "../components/input/src/input-shell.js";
import { withWebComponentBridge } from "./utils/withWebComponentBridge.js";
import { transformReactIconToCarbonIcon } from "./utils/iconTransform.js";
import type {
  SuggestionItem,
  TriggerSuggestionConfig,
  AutocompleteConfig,
} from "../components/input/src/tiptap/types.js";

const ICON_SIZE = 16;

/**
 * Transforms a single SuggestionItem's icon to CarbonIcon format when a
 * React component was supplied.
 */
function transformItemIcon(item: SuggestionItem): SuggestionItem {
  if (!item.icon) {
    return item;
  }
  return {
    ...item,
    icon: transformReactIconToCarbonIcon(item.icon, ICON_SIZE),
  };
}

type SuggestionItemsField =
  | SuggestionItem[]
  | ((query: string) => Promise<SuggestionItem[]> | SuggestionItem[]);

function transformItemsField(
  items: SuggestionItemsField,
): SuggestionItemsField {
  if (Array.isArray(items)) {
    return items.map(transformItemIcon);
  }
  return async (query: string) => {
    const resolved = await items(query);
    return resolved.map(transformItemIcon);
  };
}

function transformSuggestionConfig<
  T extends TriggerSuggestionConfig | AutocompleteConfig,
>(config: T | undefined): T | undefined {
  if (!config) {
    return config;
  }
  return { ...config, items: transformItemsField(config.items) } as T;
}

// Base input shell component from @lit/react
const BaseInputShell = withWebComponentBridge(
  createComponent({
    tagName: "cds-aichat-input-shell",
    elementClass: InputShellElement,
    react: React,
    events: {
      onChange: "cds-aichat-input-change",
      onSend: "cds-aichat-input-send",
      onFocus: "cds-aichat-input-focus",
      onBlur: "cds-aichat-input-blur",
      onTyping: "cds-aichat-input-typing",
      onKeyDown: "cds-aichat-input-keydown",
      onTriggerChange: "cds-aichat-trigger-change",
      onAutocompleteSelect: "cds-aichat-autocomplete-select",
      onCustomListRender: "cds-aichat-custom-list-render",
      onTokenRender: "cds-aichat-token-render",
    },
  }),
);

/**
 * Input shell component with automatic icon transformation for suggestion
 * items. Accepts either CarbonIcon objects or React icon components from
 * `@carbon/icons-react`; React icons are converted to the CarbonIcon format
 * expected by the web component.
 */
const InputShell = React.forwardRef<any, any>((props, ref) => {
  const { mention, command, autocomplete, starters, ...restProps } = props;

  const transformedMention = React.useMemo(
    () => transformSuggestionConfig(mention),
    [mention],
  );
  const transformedCommand = React.useMemo(
    () => transformSuggestionConfig(command),
    [command],
  );
  const transformedAutocomplete = React.useMemo(
    () => transformSuggestionConfig(autocomplete),
    [autocomplete],
  );
  const transformedStarters = React.useMemo<SuggestionItem[] | undefined>(
    () => (starters ? starters.map(transformItemIcon) : undefined),
    [starters],
  );

  return (
    <BaseInputShell
      ref={ref}
      mention={transformedMention}
      command={transformedCommand}
      autocomplete={transformedAutocomplete}
      starters={transformedStarters}
      {...restProps}
    />
  );
});

InputShell.displayName = "InputShell";

export default InputShell;
