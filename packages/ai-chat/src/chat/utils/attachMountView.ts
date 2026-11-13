/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { setVarsForSelector } from '@carbon/ai-chat-components/es/components/shared/dynamic-css-var-sheet.js';

import type { ServiceManager } from '../../shared/services/ServiceManager';
import { slotSource } from '../../shared/services/slotTracking';
import { viewActions } from '../state';
import { ChatViewState } from '../services/chatViewState';
import { createViewBindings } from '../services/createViewBindings';
import { ExtensionHosts } from '../services/extensionHosts';
import { ThemeWatcherService } from '../services/ThemeWatcherService';
import { getWindowSize } from './windowSize';

let bootContainerRulesInstalled = false;

/**
 * Installs the boot container's size rules on the shared dynamic stylesheet.
 * The container fills the host element when there is one, and otherwise stays
 * 0×0 until the chat floats out.
 */
function ensureBootContainerStyleRules(): void {
  if (bootContainerRulesInstalled) {
    return;
  }
  setVarsForSelector('.cds-aichat--boot-container--filled', {
    width: '100% !important',
    height: '100% !important',
  });
  setVarsForSelector('.cds-aichat--boot-container--collapsed', {
    width: '0 !important',
    height: '0 !important',
  });
  bootContainerRulesInstalled = true;
}

interface MountViewOptions {
  serviceManager: ServiceManager;
  /** The chat element: extension content goes in its light DOM. */
  chatElement: HTMLElement;
  /** The element React renders into, inside the chat element's shadow root. */
  renderTarget: HTMLElement;
  /** The host's element, when the chat renders into one rather than floating. */
  customHostElement?: HTMLElement;
  /** Whether request footers are collected; asked on each footer event. */
  isRequestFooterEnabled: () => boolean;
}

/** What one mounted view adds to a running chat, and how to take it away. */
interface MountView {
  readonly viewState: ChatViewState;
  readonly hosts: ExtensionHosts;
  /** Starts announcing into a region in `root`. Call once the app can render. */
  connectAnnouncer(root: ShadowRoot): void;
  /**
   * Takes the view off the chat. Window listeners, extension hosts, the
   * announcer, and the view state stop first; then `unmountApp` runs; then
   * the view's ports and the theme watcher detach. Repeat-safe.
   */
  detach(unmountApp?: () => void): void;
}

/**
 * Attaches a mounted view to a running chat: the view state, the theme
 * watcher, the view's ports, the extension hosts, and the window listeners.
 * The chat itself needs none of them; a chat `createChatSDK` starts runs
 * without.
 */
function attachMountView({
  serviceManager,
  chatElement,
  renderTarget,
  customHostElement,
  isRequestFooterEnabled,
}: MountViewOptions): MountView {
  ensureBootContainerStyleRules();
  renderTarget.classList.add('cds-aichat--boot-container');
  renderTarget.classList.toggle(
    'cds-aichat--boot-container--filled',
    Boolean(customHostElement)
  );
  renderTarget.classList.toggle(
    'cds-aichat--boot-container--collapsed',
    !customHostElement
  );

  // Each step's undo, newest first, so a throw part way undoes what started.
  const undo: Array<() => void> = [];
  const viewState = new ChatViewState(
    serviceManager,
    getWindowSize(),
    customHostElement
  );
  let themeWatcher: ThemeWatcherService;
  let detachBindings: () => void;
  let hosts: ExtensionHosts;
  let removeWindowListeners: () => void;
  try {
    viewState.connect();
    undo.unshift(() => viewState.disconnect());
    themeWatcher = new ThemeWatcherService(serviceManager.store);
    themeWatcher.connect();
    undo.unshift(() => themeWatcher.disconnect());
    // Before the host's callbacks and the initial view change, which both may
    // change the view before the shell renders.
    detachBindings = serviceManager.view.attach(createViewBindings(viewState));
    undo.unshift(detachBindings);
    hosts = new ExtensionHosts(
      slotSource(serviceManager),
      chatElement,
      serviceManager.store,
      isRequestFooterEnabled
    );
    hosts.connect();
    undo.unshift(() => hosts.disconnect());
    removeWindowListeners = listenToWindow(viewState);
  } catch (error) {
    undo.forEach((step) => step());
    throw error;
  }

  let announcerRegion: HTMLDivElement | undefined;
  let detached = false;
  return {
    viewState,
    hosts,
    connectAnnouncer(root) {
      if (detached || announcerRegion) {
        return;
      }
      announcerRegion = document.createElement('div');
      announcerRegion.className =
        'cds-aichat--visually-hidden cds-aichat--aria-announcer';
      // Outside the React target: a renderer can clear its subtree on unmount.
      root.appendChild(announcerRegion);
      viewState.announcer.connect(announcerRegion);
    },
    detach(unmountApp) {
      if (detached) {
        return;
      }
      detached = true;
      removeWindowListeners();
      hosts.disconnect();
      viewState.announcer.disconnect();
      announcerRegion?.remove();
      viewState.disconnect();
      unmountApp?.();
      detachBindings();
      themeWatcher.disconnect();
    },
  };
}

/** Feeds window size to the view state and page visibility to the store. */
function listenToWindow(viewState: ChatViewState) {
  const { serviceManager } = viewState;
  const onResize = () => {
    viewState.setWindowSize(getWindowSize());
  };
  const onVisibilityChange = () => {
    serviceManager.store.dispatch(
      viewActions.setIsBrowserPageVisible(
        document.visibilityState === 'visible'
      )
    );
  };
  // Held here: the release runs a microtask after disconnect, and a closing
  // page (or test environment) may have dropped its globals by then.
  const view = window;
  const doc = document;
  view.addEventListener('resize', onResize);
  doc.addEventListener('visibilitychange', onVisibilityChange);
  return () => {
    view.removeEventListener('resize', onResize);
    doc.removeEventListener('visibilitychange', onVisibilityChange);
  };
}

export { attachMountView };
export type { MountView };
