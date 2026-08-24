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
 * [../../components/prompt-line/src/autocomplete-controller.ts] (which also exports
 * the `<cds-aichat-autocomplete-controller>` element). The controller owns
 * trigger handling, async resolution, and selection routing; this hook
 * adapts those callbacks into React state and returns a JSX node to slot
 * into `<PromptLineShell>`.
 */

import React from 'react';
import ReactDOM from 'react-dom';
import type { JSX, ReactNode, RefObject } from 'react';

import Autocomplete from '../autocomplete.js';
import type PromptLineElement from '../../components/prompt-line/src/prompt-line.js';
import {
  AutocompleteController,
  type AutocompleteControllerState,
} from '../../components/prompt-line/src/autocomplete-controller.js';
import type {
  AutocompleteConfig,
  StartersConfig,
  SuggestionItem,
  TriggerChangeEventDetail,
  TriggerSuggestionConfig,
} from '../../components/prompt-line/src/tiptap/types.js';

export interface UseChatAutocompleteOptions {
  mention?: TriggerSuggestionConfig;
  command?: TriggerSuggestionConfig;
  autocomplete?: AutocompleteConfig;
  starters?: StartersConfig;
  /** Ref to the slotted `<cds-aichat-prompt-line>`. */
  promptLineRef: RefObject<PromptLineElement | null>;
  /** When true, starter selection inserts the text but does not auto-send. */
  isSendDisabled?: boolean;
  /** Fired after a starter is selected and inserted (used to trigger send). */
  onStarterSelected?: (text: string) => void;
  /**
   * Fired when an autocomplete suggestion item is selected.
   * Called after the controller has already inserted the item.
   */
  onSelectItem?: (item: SuggestionItem) => void;
  /**
   * Fired when the send button inside an autocomplete suggestion item is clicked.
   */
  onSendItem?: (text: string) => void;
  /** Whether the autocomplete is attached to the input (affects corner rounding). */
  attached?: boolean;
  /** Maximum height for the autocomplete popover */
  maxHeight?: string;
}

export interface UseChatAutocompleteResult {
  /** Attach to `<PromptLine onTriggerChange={...} />`. */
  onTriggerChange: (
    event: CustomEvent<TriggerChangeEventDetail | null>
  ) => void;
  /**
   * JSX to render with `slot="autocomplete-content"` inside `<PromptLineShell>`.
   * `null` while no trigger is active.
   */
  autocompleteContent: ReactNode;
}

export function useChatAutocomplete(
  options: UseChatAutocompleteOptions
): UseChatAutocompleteResult {
  const {
    mention,
    command,
    autocomplete,
    starters,
    promptLineRef,
    isSendDisabled,
    onStarterSelected,
    onSelectItem,
    onSendItem,
    attached = true,
    maxHeight,
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
  const onSelectItemRef = React.useRef(onSelectItem);
  onSelectItemRef.current = onSelectItem;
  const onSendItemRef = React.useRef(onSendItem);
  onSendItemRef.current = onSendItem;

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
    [promptLineRef]
  );

  const handleSelect = React.useCallback((item: SuggestionItem) => {
    controllerRef.current?.select(item);
    onSelectItemRef.current?.(item);
  }, []);

  const isSendDisabledRef = React.useRef(isSendDisabled);
  isSendDisabledRef.current = isSendDisabled;

  const handleSend = React.useCallback((text: string) => {
    if (!text || isSendDisabledRef.current) {
      return;
    }
    controllerRef.current?.dismiss(true);
    onSendItemRef.current?.(text);
  }, []);

  const dismiss = React.useCallback(() => {
    controllerRef.current?.dismiss();
  }, []);

  // Register / unregister the rendered list element with the controller so
  // arrow / Enter / Escape on the editor DOM get forwarded to it.
  // Also set the max-height CSS variable if provided.
  const setListElement = React.useCallback(
    (el: HTMLElement | null) => {
      controllerRef.current?.setListElement(el);
      // Pass the editor DOM as anchorElement so outside-click detection on the
      // autocomplete element doesn't dismiss the list when the user clicks the
      // editor (the editor is not inside the autocomplete element).
      if (el && 'anchorElement' in el) {
        (el as HTMLElement & { anchorElement: Element | null }).anchorElement =
          promptLineRef.current?.getEditor?.()?.view.dom ?? null;
      }
      if (el && maxHeight) {
        el.style.setProperty('--cds-aichat-autocomplete-max-height', maxHeight);
      }
    },
    [maxHeight, promptLineRef]
  );

  // Prevent mousedown on the autocomplete container from stealing focus from
  // the editor.
  const handleContainerMousedown = React.useCallback((e: React.MouseEvent) => {
    e.preventDefault();
  }, []);

  const autocompleteContent = React.useMemo<ReactNode>(() => {
    if (!state.trigger || state.items.length === 0) {
      return null;
    }
    if (state.renderCustomList) {
      const result = state.renderCustomList({
        items: state.items,
        query: state.trigger.query,
        onDismiss: dismiss,
        onSelect: handleSelect,
        onSend: handleSend,
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
            onMousedown={handleContainerMousedown}
          />
        );
      }
      return (
        <CustomReactNodePortal
          slot="autocomplete-content"
          node={result as ReactNode}
          onMount={setListElement}
          onMousedown={(e) => e.preventDefault()}
        />
      );
    }
    return (
      <Autocomplete
        ref={setListElement}
        slot="autocomplete-content"
        items={state.items}
        attached={attached}
        disableDirectSend={state.disableDirectSend}
        onDismiss={dismiss}
        onSelect={(e: CustomEvent<{ item: SuggestionItem }>) =>
          handleSelect(e.detail.item)
        }
        onSend={(e: CustomEvent<{ text: string }>) =>
          handleSend(e.detail?.text)
        }
      />
    );
  }, [
    state,
    handleSelect,
    handleSend,
    dismiss,
    setListElement,
    attached,
    handleContainerMousedown,
  ]);

  return { onTriggerChange, autocompleteContent };
}

interface CustomElementHostProps {
  slot: string;
  element: HTMLElement;
  /** Notify the parent which element is the key-forwarding target. */
  onMount?: (el: HTMLElement | null) => void;
  onMousedown?: (e: React.MouseEvent) => void;
}

/** Mounts a host-provided HTMLElement into the React tree at `slot`. */
function CustomElementHost({
  slot,
  element,
  onMount,
  onMousedown,
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
  return (
    <div
      ref={containerRef}
      role="presentation"
      slot={slot}
      onMouseDown={onMousedown}
    />
  );
}

interface CustomReactNodePortalProps {
  slot: string;
  node: ReactNode;
  onMount?: (el: HTMLElement | null) => void;
  onMousedown?: (e: MouseEvent) => void;
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
  onMousedown,
}: CustomReactNodePortalProps): JSX.Element {
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [hostElement, setHostElement] = React.useState<HTMLElement | null>(
    null
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
    const slotEl = document.createElement('slot');
    slotEl.setAttribute('name', slotName);
    container.appendChild(slotEl);

    const hostEl = document.createElement('div');
    hostEl.setAttribute('slot', slotName);
    if (onMousedown) {
      hostEl.addEventListener('mousedown', onMousedown);
    }
    chatWrapper.appendChild(hostEl);

    setHostElement(hostEl);
    return () => {
      onMount?.(null);
      if (onMousedown) {
        hostEl.removeEventListener('mousedown', onMousedown);
      }
      slotEl.remove();
      hostEl.remove();
      setHostElement(null);
    };
    // Empty deps: the slot/host pair is owned by this mount cycle and should
    // not churn as `node` updates — React's portal reconciliation handles
    // those updates in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // After the portal content is committed into hostElement, hand the first
  // child element to the controller. This is typically a custom element (e.g.
  // <cds-aichat-autocomplete>) whose properties (anchorElement, keydown
  // forwarding) only work on the element itself — not on the plain <div>
  // wrapper that createPortal renders into. Custom elements are defined
  // synchronously at module load, so by the time useEffect fires (post-paint)
  // the element is fully upgraded and its properties are available.
  React.useEffect(() => {
    if (!hostElement) {
      return;
    }
    const child = hostElement.firstElementChild as HTMLElement | null;
    onMount?.(child ?? hostElement);
  }, [hostElement, onMount]);

  return (
    <div slot={slot} ref={containerRef}>
      {hostElement ? ReactDOM.createPortal(node, hostElement) : null}
    </div>
  );
}
