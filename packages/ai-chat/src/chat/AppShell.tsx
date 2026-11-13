/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { createComponent } from '@lit/react';
import { withWebComponentBridge } from '@carbon/ai-chat-components/es/react/utils/withWebComponentBridge.js';
import { createPortal } from 'react-dom';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import NativeChatShell, {
  type ShellLayoutTargets,
} from './components/shell/ChatShell';
import type { ShellContentState, ShellOptions } from './utils/shellLifecycle';
import type { PanelContentParts } from './components/panels/PanelContentAdapter';
import { useNativeInputConfig } from './hooks/useNativeInputConfig';
import { useWriteableElementPresence } from './hooks/useWriteableElementPresence';
import { useChatViewStateInstance } from './hooks/useChatViewState';
import { useIntl } from './hooks/useIntl';
import { useSelector } from './hooks/useSelector';
import { useAppShellPanels } from './AppShellPanels';
import AppShellErrorBoundary from './AppShellErrorBoundary';
import MessagesComponent, {
  type MessagesComponentClass,
} from './components-legacy/MessagesComponent';
import { createUnmappingMemoizer } from './utils/memoizerUtils';
import { createDidCatchErrorData } from './utils/miscUtils';
import type { LocalMessageItem } from '../types/messaging/LocalMessageItem';
import type { AppState } from '../types/state/AppState';
import type { ExtensionHosts } from './services/extensionHosts';
import type { HasServiceManager } from './hocs/withServiceManager';
import { WriteableElementName } from '../types/instance/WriteableElements';

const nativeShellEvents = {};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeShell = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-chat-shell',
    elementClass: NativeChatShell,
    react: React,
    events: nativeShellEvents,
  }),
  { events: nativeShellEvents }
);

const ConfiguredNativeShell = React.forwardRef<
  NativeChatShell,
  Omit<React.ComponentPropsWithoutRef<typeof NativeShell>, 'options'> & {
    /** The shell options; this wrapper adds the prompt-line presence. */
    options: Omit<ShellOptions, 'customPromptLinePresent'>;
    normalizeInput: boolean;
  }
>(function ConfiguredNativeShell({ options, normalizeInput, ...props }, ref) {
  const { serviceManager } = useChatViewStateInstance();
  const customPromptLinePresent = useWriteableElementPresence(
    WriteableElementName.CUSTOM_PROMPT_LINE,
    serviceManager.writeableElements,
    options.writeableElementsPresentKeys
      ?.split(' ')
      .includes(WriteableElementName.CUSTOM_PROMPT_LINE)
  );
  const { mention, command, autocomplete, starters, inputActions } =
    useNativeInputConfig(normalizeInput && !customPromptLinePresent);
  const inputConfig = useMemo(
    () => ({ mention, command, autocomplete, starters, inputActions }),
    [mention, command, autocomplete, starters, inputActions]
  );
  // Hand the same presence value to the shell so the built-in input and its
  // normalized configuration change together.
  const shellOptions = useMemo(
    () => ({ ...options, customPromptLinePresent }),
    [options, customPromptLinePresent]
  );
  return (
    <NativeShell
      {...props}
      ref={ref}
      options={shellOptions}
      inputConfig={inputConfig}
    />
  );
});

interface AppShellProps extends HasServiceManager {
  hosts: ExtensionHosts;
  hostElement?: Element;
  writeableElementsPresentKeys?: string;
}

function ShellMessages({
  shell,
  targets,
  children,
}: {
  shell: NativeChatShell;
  targets: ShellLayoutTargets;
  children: React.ReactNode;
}) {
  useEffect(() => {
    shell.commitMessages(targets.messages, targets.generation);
  }, [shell, targets]);
  return createPortal(children, targets.messages);
}

function RetainedShellContent({
  serviceManager,
  hosts,
  content,
  shell,
  targets,
  messagesRef,
  onRevision,
}: {
  serviceManager: AppShellProps['serviceManager'];
  hosts: ExtensionHosts;
  content: ShellContentState;
  shell: NativeChatShell;
  targets?: ShellLayoutTargets;
  messagesRef: React.RefObject<MessagesComponentClass | null>;
  onRevision: (parts: PanelContentParts) => void;
}) {
  const intl = useIntl();
  const assistantMessageState = useSelector(
    (state: AppState) => state.assistantMessageState
  );
  const allMessageItemsByID = useSelector(
    (state: AppState) => state.allMessageItemsByID
  );
  const publicConfig = useSelector((state: AppState) => state.config.public);
  const carbonTheme = useSelector(
    (state: AppState) =>
      state.config.derived.themeWithDefaults.derivedCarbonTheme
  );
  const messagesToArray = useMemo(
    () => createUnmappingMemoizer<LocalMessageItem>(),
    []
  );
  const panelContent = useAppShellPanels({
    serviceManager,
    hosts,
    content,
    onRevision,
  });
  return (
    <>
      {panelContent}
      {!content.inputs.isHomeScreenActive && targets?.messages && (
        <ShellMessages shell={shell} targets={targets}>
          <MessagesComponent
            ref={messagesRef}
            messageState={assistantMessageState}
            localMessageItems={messagesToArray(
              assistantMessageState.localMessageIDs,
              allMessageItemsByID
            )}
            requestInputFocus={content.requestInputFocus}
            assistantName={publicConfig.assistantName}
            assistantAvatarUrl={publicConfig.assistantAvatarUrl}
            intl={intl}
            onEndHumanAgentChat={content.showConfirmEndChat}
            locale={publicConfig.locale || 'en'}
            carbonTheme={carbonTheme}
          />
        </ShellMessages>
      )}
    </>
  );
}

function AppShell({
  serviceManager,
  hosts,
  hostElement,
  writeableElementsPresentKeys,
}: AppShellProps) {
  const viewState = useChatViewStateInstance();
  const catastrophicErrorType = useSelector(
    (state: AppState) => state.catastrophicErrorType
  );
  const [targets, setTargets] = useState<ShellLayoutTargets>();
  const [content, setContent] = useState<ShellContentState>();
  const shellRef = useRef<NativeChatShell | null>(null);
  const messagesRef = useRef<MessagesComponentClass | null>(null);
  const active = useRef(true);
  const releaseInitialCommit = useRef<() => void>(undefined);
  const options = useMemo(
    () => ({ hosts, hostElement, writeableElementsPresentKeys }),
    [hosts, hostElement, writeableElementsPresentKeys]
  );
  const getMessages = useCallback(() => messagesRef.current, []);
  const onTargetsReady = useCallback((next: ShellLayoutTargets | undefined) => {
    if (active.current) {
      setTargets(next);
    }
  }, []);
  const onContentState = useCallback((next: ShellContentState) => {
    if (active.current) {
      setContent(next);
    }
  }, []);
  const onRevision = useCallback((parts: PanelContentParts) => {
    const shell = shellRef.current;
    if (shell) {
      shell.contentRevision = parts;
    }
  }, []);
  const setShell = useCallback((shell: NativeChatShell | null) => {
    if (shellRef.current !== shell) {
      shellRef.current?.setContentConnected(false);
    }
    shellRef.current = shell;
    shell?.setContentConnected(true);
  }, []);
  useLayoutEffect(() => {
    active.current = true;
    const release = viewState.holdInitialReactCommit();
    releaseInitialCommit.current = release;
    return () => {
      active.current = false;
      release();
    };
  }, [viewState]);
  useEffect(() => {
    const shell = shellRef.current;
    if (!shell) {
      return undefined;
    }
    let current = true;
    void shell.whenReady().then(() => {
      if (current && shellRef.current === shell) {
        releaseInitialCommit.current?.();
      }
    });
    return () => {
      current = false;
    };
  }, [targets]);
  const handleBoundaryError = useCallback(
    (error: Error, errorInfo: React.ErrorInfo) => {
      serviceManager.actions.errorOccurred(
        createDidCatchErrorData('AppShell', error, errorInfo, true)
      );
    },
    [serviceManager]
  );
  return (
    <AppShellErrorBoundary onError={handleBoundaryError}>
      <ConfiguredNativeShell
        ref={setShell}
        options={options}
        normalizeInput={!catastrophicErrorType}
        transformIcon={transformReactIconToCarbonIcon}
        getMessages={getMessages}
        onContentState={onContentState}
        onTargetsReady={onTargetsReady}
      />
      {content && shellRef.current && (
        <RetainedShellContent
          serviceManager={serviceManager}
          hosts={hosts}
          content={content}
          shell={shellRef.current}
          targets={targets}
          messagesRef={messagesRef}
          onRevision={onRevision}
        />
      )}
    </AppShellErrorBoundary>
  );
}
export default React.memo(AppShell);
