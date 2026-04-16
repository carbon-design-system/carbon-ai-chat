/**
 * @license
 *
 * Copyright IBM Corp. 2025
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
  SuggestionConfig,
} from "../components/input/src/types.js";

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

/**
 * Transforms all suggestion configs, converting React icon components
 * in items and initialItems to CarbonIcon format.
 */
function transformSuggestionConfigs(
  configs: SuggestionConfig[],
): SuggestionConfig[] {
  return configs.map((config) => {
    const transformed: SuggestionConfig = { ...config };

    if (Array.isArray(config.items)) {
      transformed.items = config.items.map(transformItemIcon);
    } else {
      const asyncFn = config.items;
      transformed.items = async (query: string) => {
        const items = await asyncFn(query);
        return items.map(transformItemIcon);
      };
    }

    if (config.initialItems) {
      transformed.initialItems = config.initialItems.map(transformItemIcon);
    }

    return transformed;
  });
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
 * Input shell component with automatic icon transformation support.
 *
 * Accepts suggestion configs with either CarbonIcon objects or React icon components
 * from `@carbon/icons-react`. React icons are automatically transformed to the
 * CarbonIcon format expected by the web component.
 */
const InputShell = React.forwardRef<any, any>((props, ref) => {
  const { suggestionConfigs, ...restProps } = props;

  const transformedConfigs = React.useMemo(() => {
    if (!suggestionConfigs) {
      return undefined;
    }
    return transformSuggestionConfigs(suggestionConfigs);
  }, [suggestionConfigs]);

  return (
    <BaseInputShell
      ref={ref}
      suggestionConfigs={transformedConfigs}
      {...restProps}
    />
  );
});

InputShell.displayName = "InputShell";

export default InputShell;
