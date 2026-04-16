/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { history } from "prosemirror-history";
import type { Plugin } from "prosemirror-state";
import {
  createValueSyncPlugin,
  type ValueSyncController,
} from "./value-sync-plugin.js";
import { createPastePlugin } from "./paste-plugin.js";
import {
  createTriggerPlugin,
  type SuggestionConfigsRef,
} from "./trigger-plugin.js";
import { createTokenPlugin } from "./token-plugin.js";
import {
  createTypingIndicatorPlugin,
  type TypingIndicatorController,
} from "./typing-indicator-plugin.js";
import {
  createInputKeymap,
  type AutocompleteKeyForwarderRef,
} from "./keymap.js";

/**
 * Mutable refs that the InputShell updates at runtime to configure
 * plugin behavior without recreating the entire EditorState.
 */
export interface PluginRefs {
  suggestionConfigs: SuggestionConfigsRef;
  autocompleteKeyForwarder: AutocompleteKeyForwarderRef;
}

/**
 * Controllers exposed by plugins for imperative operations.
 */
export interface PluginControllers {
  valueSync: ValueSyncController;
  typingIndicator: TypingIndicatorController;
}

/**
 * Create all ProseMirror plugins for the chat input.
 * Returns the plugin array plus mutable refs and controllers.
 */
export function createAllPlugins(): {
  plugins: Plugin[];
  refs: PluginRefs;
  controllers: PluginControllers;
} {
  // Mutable refs for runtime configuration
  const suggestionConfigs: SuggestionConfigsRef = { current: [] };
  const autocompleteKeyForwarder: AutocompleteKeyForwarderRef = {
    current: null,
  };

  // Create plugins
  const { plugin: valueSyncPlugin, controller: valueSyncController } =
    createValueSyncPlugin();
  const { plugin: typingPlugin, controller: typingController } =
    createTypingIndicatorPlugin();

  const plugins: Plugin[] = [
    // Keymap before baseKeymap
    ...createInputKeymap(autocompleteKeyForwarder),

    // History (undo/redo state)
    history(),

    // Core plugins
    valueSyncPlugin,
    createTriggerPlugin(suggestionConfigs),
    createTokenPlugin(suggestionConfigs),
    createPastePlugin(),

    // Utility plugins
    typingPlugin,
  ];

  return {
    plugins,
    refs: {
      suggestionConfigs,
      autocompleteKeyForwarder,
    },
    controllers: {
      valueSync: valueSyncController,
      typingIndicator: typingController,
    },
  };
}
