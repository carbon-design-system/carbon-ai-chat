/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  type HTMLAttributes,
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { ChatInstance } from "../types/instance/ChatInstance";
import {
  BusEventViewChange,
  BusEventViewPreChange,
} from "../types/events/eventBusTypes";
import { OnAttachDetails } from "../types/component/ChatContainer";
import { ChatContainer, ChatContainerProps } from "./ChatContainer";
import { FLATTENED_PUBLIC_CONFIG_FIELDS } from "../web-components/shared/flattenedPublicConfig";
import { isBrowser } from "../chat/utils/browserUtils";

/**
 * Properties for the ChatContainer React component. This interface extends
 * {@link ChatContainerProps} and {@link PublicConfig} with additional component-specific props, flattening all
 * config properties as top-level props for better TypeScript IntelliSense.
 *
 * @category React
 */
interface ChatCustomElementProps extends ChatContainerProps {
  /**
   * A CSS class name that will be added to the custom element. This class must define the size of the
   * your custom element (width and height or using logical inline-size/block-size).
   *
   * You can make use of onViewPreChange and/or onViewChange to mutate this className value so have open/close animations.
   *
   * By default, the chat will just set the chat shell to a 0x0 size and mark everything but the launcher (is you are using it)
   * as display: none; if the chat is set to closed.
   */
  className: string;

  /**
   * An optional id that will be added to the custom element.
   */
  id?: string;

  /**
   * Called before a view change (chat opening/closing). The chat will hide the chat shell inside your custom element
   * to prevent invisible keyboard stops when the view change is *complete*.
   *
   * Use this callback to update your className value *before* the view change happens if you want to add any open/close
   * animations to your custom element before the chat shell inner contents are hidden. It is async and so you can
   * tie it to native the AnimationEvent and only return when your animations have completed.
   *
   * A common pattern is to use this for when the chat is closing and to use onViewChange for when the chat opens.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded as it is registered before the
   * chat renders. After Carbon AI Chat is loaded, the callback will not be updated.
   */
  onViewPreChange?: (
    event: BusEventViewPreChange,
    instance: ChatInstance,
  ) => Promise<void> | void;

  /**
   * Called when the chat view change is complete. If no callback is provided here, the default behavior will be to set
   * the chat shell to 0x0 size and set all inner contents aside from the launcher, if you are using it, to display: none.
   * The inner contents of the chat shell (aside from the launcher if you are using it) are always set to display: none
   * regardless of what is configured with this callback to prevent invisible tab stops and screen reader issues.
   *
   * Use this callback to update your className value when the chat has finished being opened or closed.
   *
   * You can provide a different callback here if you want custom animation behavior when the chat is opened or closed.
   * The animation behavior defined here will run in concert with the chat inside your custom container being hidden.
   *
   * If you want to run animations before the inner contents of the chat shell is shrunk and the inner contents are hidden,
   * make use of onViewPreChange.
   *
   * A common pattern is to use this for when the chat is opening and to use onViewPreChange for when the chat closes.
   *
   * Note that this function can only be provided before Carbon AI Chat is loaded as it is registered before the
   * chat renders. After Carbon AI Chat is loaded, the callback will not be updated.
   */
  onViewChange?: (event: BusEventViewChange, instance: ChatInstance) => void;
}

const customElementStylesheet =
  isBrowser() && typeof CSSStyleSheet !== "undefined"
    ? new CSSStyleSheet()
    : null;

const hideStyles = `
  .cds-aichat--hidden {
    width: 0 !important;
    height: 0 !important;
    min-width: 0 !important;
    min-height: 0 !important;
    max-width: 0 !important;
    max-height: 0 !important;
    inline-size: 0 !important;
    block-size: 0 !important;
    min-inline-size: 0 !important;
    min-block-size: 0 !important;
    max-inline-size: 0 !important;
    max-block-size: 0 !important;
    overflow: hidden !important;
  }
`;

// Inject styles using adopted stylesheets when available, fallback to style element
if (
  isBrowser() &&
  !document.getElementById("cds-aichat-custom-element-styles")
) {
  if (customElementStylesheet && "replaceSync" in customElementStylesheet) {
    customElementStylesheet.replaceSync(hideStyles);
    document.adoptedStyleSheets = [
      ...document.adoptedStyleSheets,
      customElementStylesheet,
    ];
  } else {
    // Fallback for when adoptedStyleSheets are not supported
    const style = document.createElement("style");
    style.id = "cds-aichat-custom-element-styles";
    style.textContent = hideStyles;
    document.head.appendChild(style);
  }
}

/**
 * This is the React component for people injecting a Carbon AI Chat with a custom element.
 *
 * It provides said element any class or id defined on itself for styling. It then calls ChatContainer with the custom
 * element passed in as a property to be used instead of generating an element with the default properties for a
 * floating chat.
 *
 * @category React
 */
function ChatCustomElement(
  props: ChatCustomElementProps &
    Omit<HTMLAttributes<HTMLDivElement>, keyof ChatCustomElementProps>,
) {
  const {
    onBeforeRender,
    onAfterRender,
    onAttach,
    onViewChange,
    onViewPreChange,
    renderUserDefinedResponse,
    renderCustomMessageFooter,
    renderWriteableElements,
    className,
    id,
    // Everything else is either a flattened PublicConfig field (forwarded to
    // ChatContainer) or an arbitrary DOM attribute (forwarded to the wrapper
    // element). They are split below using the shared field table, so no config
    // field is ever hand-listed here.
    ...rest
  } = props;

  // Pull the flattened config fields out of `rest` using the single shared
  // table, leaving only the pass-through DOM attributes for the wrapper element.
  // ChatContainer reconstructs the PublicConfig from these flattened props
  // itself, so both surfaces share one field list and cannot drift.
  const configProps: Record<string, unknown> = {};
  const wrapperDomProps: Record<string, unknown> = { ...rest };
  for (const field of FLATTENED_PUBLIC_CONFIG_FIELDS) {
    if (field.name in rest) {
      configProps[field.name] = (rest as Record<string, unknown>)[field.name];
      delete wrapperDomProps[field.name];
    }
  }

  const containerRef = useRef<HTMLDivElement>(null);
  const [elementReady, setElementReady] = useState(false);

  useLayoutEffect(() => {
    setElementReady(true);
  }, []);

  // Show or hide the custom element by toggling the 0x0 sizing class.
  const applyVisibility = useCallback((mainWindowOpen: boolean) => {
    const el = containerRef.current;
    if (el) {
      el.classList.toggle("cds-aichat--hidden", !mainWindowOpen);
    }
  }, []);

  // The default view-change handler when the consumer provides none. Passed through to
  // ChatContainer as the effective onViewChange so its per-attach trampoline (re)subscribes it on
  // every mount — a reuse re-attach of a fresh element then shows/hides correctly, which a
  // boot-once subscription on this component would not.
  const defaultViewChangeHandler = useCallback(
    (event: BusEventViewChange) =>
      applyVisibility(event.newViewState.mainWindow),
    [applyVisibility],
  );

  // On a reuse re-attach the initial view change does not re-fire (the view state is already
  // established in the preserved store), so seed this fresh element's visibility from the current
  // state — otherwise a chat that was closed at unmount would reappear full-size until the next
  // toggle. Then hand off to the consumer's onAttach.
  const onAttachOverride = useCallback(
    (instance: ChatInstance, details: OnAttachDetails) => {
      if (details.remount && !onViewChange) {
        // Only when using the default handler; a consumer onViewChange owns its element sizing.
        applyVisibility(Boolean(instance.getState().viewState.mainWindow));
      }
      onAttach?.(instance, details);
    },
    [applyVisibility, onAttach, onViewChange],
  );

  return (
    <div
      className={className}
      id={id}
      ref={containerRef}
      {...(wrapperDomProps as HTMLAttributes<HTMLDivElement>)}
    >
      {elementReady && containerRef.current && (
        <ChatContainer
          // Flattened PublicConfig fields, split from the shared field table.
          {...(configProps as ChatContainerProps)}
          // ChatContainer-specific props (not part of PublicConfig).
          onBeforeRender={onBeforeRender}
          onAfterRender={onAfterRender}
          onAttach={onAttachOverride}
          onViewPreChange={onViewPreChange}
          onViewChange={onViewChange ?? defaultViewChangeHandler}
          renderUserDefinedResponse={renderUserDefinedResponse}
          renderCustomMessageFooter={renderCustomMessageFooter}
          renderWriteableElements={renderWriteableElements}
          element={containerRef.current}
        />
      )}
    </div>
  );
}

export { ChatCustomElement, ChatCustomElementProps };
