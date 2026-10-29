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
import { createPortal } from 'react-dom';
import { transformReactIconToCarbonIcon } from '@carbon/ai-chat-components/es/globals/utils/iconTransform.js';
import NativeChatShell, {
  type ShellLayoutTargets,
} from './components/shell/ChatShell';
import type { ShellContentState } from './utils/shellLifecycle';
import type { PanelContentParts } from './components/panels/PanelContentAdapter';
import { useNativeInputConfig } from './hooks/useNativeInputConfig';
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

const NativeShell = createComponent({
  tagName: 'cds-aichat-chat-shell',
  elementClass: NativeChatShell,
  react: React,
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
  const inputConfig = useNativeInputConfig();
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
  const { mention, command, autocomplete, starters, inputActions } =
    inputConfig;
  const normalizedInputConfig = useMemo(
    () => ({ mention, command, autocomplete, starters, inputActions }),
    [mention, command, autocomplete, starters, inputActions]
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
      <NativeShell
        ref={setShell}
        options={options}
        inputConfig={normalizedInputConfig}
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
