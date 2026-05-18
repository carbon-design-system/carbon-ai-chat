/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * React hook for the chat-input autocomplete overlay. Thin wrapper around
 * the framework-agnostic `AutocompleteController` co-located in
 * [../../components/input/src/autocomplete-controller.ts] (which also exports
 * the `<cds-aichat-autocomplete-controller>` element). The controller owns
 * trigger handling, async resolution, and selection routing; this hook
 * adapts those callbacks into React state and returns a JSX node to slot
 * into `<InputShell>`.
 */

import React from "react";
import ReactDOM from "react-dom";
import type { JSX, ReactNode, RefObject } from "react";

import Autocomplete from "../autocomplete.js";
import type PromptLineElement from "../../components/input/src/prompt-line.js";
import {
  AutocompleteController,
  type AutocompleteControllerState,
} from "../../components/input/src/autocomplete-controller.js";
import type {
  AutocompleteConfig,
  SuggestionItem,
  TriggerChangeEventDetail,
  TriggerSuggestionConfig,
} from "../../components/input/src/tiptap/types.js";

export interface UseChatAutocompleteOptions {
  mention?: TriggerSuggestionConfig;
  command?: TriggerSuggestionConfig;
  autocomplete?: AutocompleteConfig;
  starters?: SuggestionItem[];
  /** Ref to the slotted `<cds-aichat-prompt-line>`. */
  promptLineRef: RefObject<PromptLineElement | null>;
  /** When true, starter selection inserts the text but does not auto-send. */
  isSendDisabled?: boolean;
  /** Fired after a starter is selected and inserted (used to trigger send). */
  onStarterSelected?: (text: string) => void;
}

export interface UseChatAutocompleteResult {
  /** Attach to `<PromptLine onTriggerChange={...} />`. */
  onTriggerChange: (
    event: CustomEvent<TriggerChangeEventDetail | null>,
  ) => void;
  /**
   * JSX to render with `slot="autocomplete-content"` inside `<InputShell>`.
   * `null` while no trigger is active.
   */
  autocompleteContent: ReactNode;
}

export function useChatAutocomplete(
  options: UseChatAutocompleteOptions,
): UseChatAutocompleteResult {
  const {
    mention,
    command,
    autocomplete,
    starters,
    promptLineRef,
    isSendDisabled,
    onStarterSelected,
  } = options;

  const [state, setState] = React.useState<AutocompleteControllerState>({
    trigger: null,
    items: [],
  });

  // Keep the controller stable for the hook's lifetime — set in a layout
  // effect so it's wired before any event handler can fire.
  const controllerRef = React.useRef<AutocompleteController | null>(null);
  // Latest config / callback values; the controller stores its own copies
  // but reading them out of refs avoids re-instantiation churn.
  const onStarterRef = React.useRef(onStarterSelected);
  onStarterRef.current = onStarterSelected;

  if (!controllerRef.current) {
    controllerRef.current = new AutocompleteController({
      mention,
      command,
      autocomplete,
      starters,
      isSendDisabled,
      onStarterSelected: (text) => onStarterRef.current?.(text),
      onChange: setState,
    });
  }

  // Push prop changes into the controller without recreating it.
  React.useEffect(() => {
    controllerRef.current?.setConfigs({
      mention,
      command,
      autocomplete,
      starters,
      isSendDisabled,
    });
  }, [mention, command, autocomplete, starters, isSendDisabled]);

  // Keep the controller pointed at the live prompt-line element.
  React.useEffect(() => {
    controllerRef.current?.setPromptLine(promptLineRef.current);
  });

  React.useEffect(() => {
    return () => {
      controllerRef.current?.destroy();
      controllerRef.current = null;
    };
  }, []);

  const onTriggerChange = React.useCallback(
    (event: CustomEvent<TriggerChangeEventDetail | null>) => {
      // Pin the controller to the current prompt-line ref before handing
      // off the detail — the React caller's ref is authoritative.
      controllerRef.current?.setPromptLine(promptLineRef.current);
      controllerRef.current?.handleTriggerChange(event.detail ?? null);
    },
    [promptLineRef],
  );

  const handleSelect = React.useCallback((item: SuggestionItem) => {
    controllerRef.current?.select(item);
  }, []);

  const dismiss = React.useCallback(() => {
    controllerRef.current?.dismiss();
  }, []);

  // Register / unregister the rendered list element with the controller so
  // arrow / Enter / Escape on the editor DOM get forwarded to it.
  const setListElement = React.useCallback((el: HTMLElement | null) => {
    controllerRef.current?.setListElement(el);
  }, []);

  const autocompleteContent = React.useMemo<ReactNode>(() => {
    if (!state.trigger || state.items.length === 0) {
      return null;
    }
    if (state.renderCustomList) {
      const result = state.renderCustomList({
        items: state.items,
        query: state.trigger.query,
        onSelect: handleSelect,
        onDismiss: dismiss,
      });
      if (result == null) {
        return null;
      }
      if (result instanceof HTMLElement) {
        return (
          <CustomElementHost
            slot="autocomplete-content"
            element={result}
            onMount={setListElement}
          />
        );
      }
      return (
        <CustomReactNodePortal
          slot="autocomplete-content"
          node={result as ReactNode}
          onMount={setListElement}
        />
      );
    }
    return (
      <Autocomplete
        ref={setListElement}
        slot="autocomplete-content"
        items={state.items}
        onSelect={(e: CustomEvent<{ item: SuggestionItem }>) =>
          handleSelect(e.detail.item)
        }
        onDismiss={dismiss}
      />
    );
  }, [state, handleSelect, dismiss, setListElement]);

  return { onTriggerChange, autocompleteContent };
}

interface CustomElementHostProps {
  slot: string;
  element: HTMLElement;
  /** Notify the parent which element is the key-forwarding target. */
  onMount?: (el: HTMLElement | null) => void;
}

/** Mounts a host-provided HTMLElement into the React tree at `slot`. */
function CustomElementHost({
  slot,
  element,
  onMount,
}: CustomElementHostProps): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    container.appendChild(element);
    onMount?.(element);
    return () => {
      onMount?.(null);
      if (element.parentNode === container) {
        container.removeChild(element);
      }
    };
  }, [element, onMount]);
  return <div ref={containerRef} slot={slot} />;
}

interface CustomReactNodePortalProps {
  slot: string;
  node: ReactNode;
  onMount?: (el: HTMLElement | null) => void;
}

let autocompletePortalCounter = 0;

/**
 * Projects a consumer-supplied React node into the page's light DOM via a
 * two-level slot/host pair so external `<style>` tags reach it. The rendered
 * `<div>` is a slot-projected anchor in the shell's `autocomplete-content`
 * slot; a sibling `<div slot="…">` is appended to the chatWrapper (the host
 * of the surrounding shadow root) and receives the React node via
 * `createPortal`. Without this hop the node would mount inside the chat's
 * shadow root, hidden from page CSS.
 */
function CustomReactNodePortal({
  slot,
  node,
  onMount,
}: CustomReactNodePortalProps): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hostElement, setHostElement] = React.useState<HTMLElement | null>(
    null,
  );

  React.useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const rootNode = container.getRootNode();
    const chatWrapper =
      rootNode instanceof ShadowRoot ? (rootNode.host as HTMLElement) : null;
    if (!chatWrapper) {
      return undefined;
    }

    const slotName = `cds-aichat-autocomplete-${++autocompletePortalCounter}`;
    const slotEl = document.createElement("slot");
    slotEl.setAttribute("name", slotName);
    container.appendChild(slotEl);

    const hostEl = document.createElement("div");
    hostEl.setAttribute("slot", slotName);
    chatWrapper.appendChild(hostEl);

    setHostElement(hostEl);
    onMount?.(hostEl);

    return () => {
      onMount?.(null);
      slotEl.remove();
      hostEl.remove();
      setHostElement(null);
    };
    // Empty deps: the slot/host pair is owned by this mount cycle and should
    // not churn as `node` updates — React's portal reconciliation handles
    // those updates in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div slot={slot} ref={containerRef}>
      {hostElement ? ReactDOM.createPortal(node, hostElement) : null}
    </div>
  );
}
