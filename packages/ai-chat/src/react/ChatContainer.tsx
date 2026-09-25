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
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { createPortal } from 'react-dom';

import type { ChatAppEntryProps } from '../chat/ChatAppEntry';
import CdsAiChatContainer from '../web-components/cds-aichat-container/cds-aichat-container';
import type { ChatRenderer } from '../web-components/shared/react-renderer';
import { ChatContainerProps } from '../types/component/ChatContainer';
import { FLATTENED_PUBLIC_CONFIG_FIELDS } from '../web-components/shared/flattenedPublicConfig';
import { isBrowser } from '../chat/utils/browserUtils';

// This component renders nothing on a server, but its hooks still run there,
// and React 17 and 18 warn that a layout effect does nothing during server
// rendering.
const useHostLayoutEffect = isBrowser() ? useLayoutEffect : useEffect;

const REACT_DOM_PROPS = new Set([
  'children',
  'localName',
  'ref',
  'style',
  'className',
]);

/**
 * Sets the chat's properties on the host element directly, rather than through
 * a `@lit/react` wrapper: that wrapper's server build assigns no properties at
 * all, so a host testing under an environment that resolves it — happy-dom,
 * for one — would render a chat that never starts.
 */
function useElementProperties(
  host: CdsAiChatContainer | null,
  properties: Record<string, unknown>
) {
  const previousRef = useRef<Record<string, unknown>>({});
  useHostLayoutEffect(() => {
    if (!host) {
      return;
    }
    const setProperty = (name: string, value: unknown) => {
      if (value == null && name in HTMLElement.prototype) {
        host.removeAttribute(name);
      } else {
        (host as unknown as Record<string, unknown>)[name] = value;
      }
    };
    const previous = previousRef.current;
    for (const [name, value] of Object.entries(properties)) {
      setProperty(name, value);
    }
    for (const name of Object.keys(previous)) {
      if (!(name in properties)) {
        setProperty(name, undefined);
      }
    }
    previousRef.current = properties;
  });
}

/** One mount of the app, as the container's internal element requested it. */
interface HostedMount {
  id: number;
  target: HTMLElement;
  inputs: ChatAppEntryProps;
}

let nextMountId = 0;

/**
 * A renderer that hands each mount back to this component instead of creating
 * a React root, so the app renders through a portal in the host's own tree.
 * Host context, event bubbling, and error boundaries then reach it unchanged.
 *
 * Each mount gets a new id. The app is keyed by it, so a detach and reattach
 * starts from fresh hook state even when React batches both updates.
 */
function useHostRenderer(): [ChatRenderer, HostedMount | null] {
  const [hosted, setHosted] = useState<HostedMount | null>(null);
  const mountedRef = useRef(false);

  useHostLayoutEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const [renderer] = useState<ChatRenderer>(() => ({
    mount(target) {
      const id = ++nextMountId;
      const update = (
        next: (current: HostedMount | null) => HostedMount | null
      ) => {
        // The container detaches while React removes this component; that
        // update has nowhere to go.
        if (mountedRef.current) {
          setHosted(next);
        }
      };
      return {
        render(inputs) {
          update(() => ({ id, target, inputs }));
        },
        unmount() {
          update((current) => (current?.id === id ? null : current));
        },
      };
    },
  }));

  return [renderer, hosted];
}

/**
 * The ChatContainer renders the chat through the `cds-aichat-container` web component, keeping the React app in the
 * host application's React tree.
 *
 * @category React
 */
function ChatContainer(
  props: ChatContainerProps &
    Omit<HTMLAttributes<HTMLElement>, keyof ChatContainerProps>
) {
  const {
    onBeforeRender,
    onAfterRender,
    onViewChange,
    onViewPreChange,
    renderUserDefinedResponse,
    renderUserDefinedInputNode,
    renderCustomMessageFooter,
    renderCustomRequestFooter,
    renderWriteableElements,
    element,
    // Everything else is either a flattened PublicConfig field or an arbitrary
    // DOM attribute. Both go to the container element, which tells them apart.
    ...rest
  } = props;

  // Split the remaining props with the shared field table: flattened config
  // fields become element properties — the chat boots from the config the
  // element resolves — and everything left is a DOM attribute or event
  // handler React sets on the host itself.
  const domProps: Record<string, unknown> = { ...rest };
  const elementProperties: Record<string, unknown> = {
    element,
    onBeforeRender,
    onAfterRender,
    onViewChange,
    onViewPreChange,
  };
  for (const field of FLATTENED_PUBLIC_CONFIG_FIELDS) {
    if (field.name in domProps) {
      elementProperties[field.name] = domProps[field.name];
      delete domProps[field.name];
    }
  }

  // React 17/18 treat custom-element props as attributes. Native properties
  // need their DOM setters, while React still owns styles, children and events.
  for (const [name, value] of Object.entries(domProps)) {
    if (name === 'className') {
      domProps.class = value;
      delete domProps.className;
    } else if (
      !REACT_DOM_PROPS.has(name) &&
      name in CdsAiChatContainer.prototype
    ) {
      elementProperties[name] = value;
      delete domProps[name];
    }
  }

  const [host, setHost] = useState<CdsAiChatContainer | null>(null);
  const captureHost = useCallback((node: CdsAiChatContainer | null) => {
    // Suspense detaches refs while hiding the tree. Clearing the host here
    // would drop the suspended portal and dismiss the host's fallback.
    if (node) {
      setHost(node);
    }
  }, []);
  const [renderer, hosted] = useHostRenderer();
  useElementProperties(host, { ...elementProperties, renderer });

  const [entry, setEntry] = useState<
    typeof import('../chat/ChatAppEntry') | { error: unknown } | null
  >(null);
  useEffect(() => {
    if (!isBrowser()) {
      return undefined;
    }
    let current = true;
    // Load browser-only UI without adding a Suspense boundary that would
    // intercept the host's fallback for its own lazy custom content.
    import('../chat/ChatAppEntry').then(
      (module) => {
        if (current) {
          setEntry(module);
        }
      },
      (error) => {
        if (current) {
          setEntry({ error });
        }
      }
    );
    return () => {
      current = false;
    };
  }, []);

  if (entry && 'error' in entry) {
    throw entry.error;
  }
  const ChatAppEntry =
    entry && 'ChatAppEntry' in entry ? entry.ChatAppEntry : null;

  // If we are in SSR mode, just short circuit here. This prevents all of our window.* and document.* stuff from trying
  // to run and erroring out.
  if (!isBrowser()) {
    return null;
  }

  return (
    <>
      {React.createElement('cds-aichat-container', {
        ...domProps,
        ref: captureHost,
      })}
      {ChatAppEntry &&
        hosted &&
        host &&
        createPortal(
          <ChatAppEntry
            key={hosted.id}
            {...hosted.inputs}
            chatWrapper={host}
            renderUserDefinedResponse={renderUserDefinedResponse}
            renderUserDefinedInputNode={renderUserDefinedInputNode}
            renderCustomMessageFooter={renderCustomMessageFooter}
            renderCustomRequestFooter={renderCustomRequestFooter}
            renderWriteableElements={renderWriteableElements}
          />,
          hosted.target,
          String(hosted.id)
        )}
    </>
  );
}

export { ChatContainer, ChatContainerProps };
