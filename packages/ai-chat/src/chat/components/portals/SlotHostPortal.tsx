/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { ReactNode, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

import { isElement } from '../../utils/domUtils';
import type {
  ExtensionHosts,
  SlotKind,
} from '../../services/extensionHosts';

/**
 * Renders one render-prop result into its slot host. React content goes
 * through a portal. A web-component host's callback returns a DOM element
 * instead; that element goes into the host as is, and stays put while the
 * callback keeps returning it, so it is never detached and re-attached.
 */
function SlotHostPortal({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode | HTMLElement;
}) {
  const element = isElement(children as Node)
    ? (children as HTMLElement)
    : null;

  useLayoutEffect(() => {
    if (!element) {
      return undefined;
    }
    if (element.parentNode !== hostElement) {
      hostElement.appendChild(element);
    }
    return () => {
      if (element.parentNode === hostElement) {
        element.remove();
      }
    };
  }, [hostElement, element]);

  return element
    ? null
    : ReactDOM.createPortal(children as ReactNode, hostElement);
}

interface ExtensionSlotHostProps {
  hosts: ExtensionHosts;
  kind: SlotKind;
  slot: string;
  content: ReactNode;
  /** False when an empty result should leave no host behind. */
  keepEmptyHost: boolean;
}

/**
 * Reports to the host service that a kind has a render callback while it is
 * mounted. Render it before that kind's slots: layout effects run in tree
 * order, so the hosts attach before their content's own layout effects.
 */
function RendererReport({
  hosts,
  kind,
}: {
  hosts: ExtensionHosts;
  kind: SlotKind;
}): null {
  useLayoutEffect(() => {
    hosts.setRendererPresent(kind, true);
    return () => hosts.setRendererPresent(kind, false);
  }, [hosts, kind]);
  return null;
}

/**
 * Reports that a slot rendered content while it is mounted. Render it before
 * the content, for the same reason as {@link RendererReport}. A Suspense hide
 * runs the cleanup, which detaches the host until the reveal.
 */
function ContentReport({
  hosts,
  kind,
  slot,
  host,
}: {
  hosts: ExtensionHosts;
  kind: SlotKind;
  slot: string;
  /** Re-reports when the service replaces the slot's host. */
  host: HTMLElement;
}): null {
  useLayoutEffect(() => {
    hosts.setHasContent(kind, slot, true);
    return () => hosts.setHasContent(kind, slot, false);
  }, [hosts, kind, slot, host]);
  return null;
}

/** Places one render-prop result in the slot's host, which the host service owns. */
function ExtensionSlotHost({
  hosts,
  kind,
  slot,
  content,
  keepEmptyHost,
}: ExtensionSlotHostProps) {
  const host = hosts.hostFor(kind, slot);
  if (!keepEmptyHost && !content) {
    return null;
  }
  return (
    <>
      <ContentReport hosts={hosts} kind={kind} slot={slot} host={host} />
      <SlotHostPortal hostElement={host}>{content}</SlotHostPortal>
    </>
  );
}

export { SlotHostPortal, ExtensionSlotHost, RendererReport };
