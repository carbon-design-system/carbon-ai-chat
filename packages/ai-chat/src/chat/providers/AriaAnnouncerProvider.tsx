/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useEffect, useRef, MutableRefObject } from 'react';
import { useIntl } from '../hooks/useIntl';

import {
  AriaAnnouncerContext,
  AriaAnnouncerFunctionType,
} from '../contexts/AriaAnnouncerContext';
import { useServiceManager } from '../hooks/useServiceManager';
import { AnnounceMessage } from '../../types/state/AppState';
import { HasChildren } from '../../types/utilities/HasChildren';
import {
  mountAriaAnnouncer,
  AriaAnnouncerHandle,
} from '@carbon/ai-chat-components/es/globals/utils/aria-announcer-manager.js';
import { nodeToText } from '../utils/domUtils';

// ---------------------------------------------------------------------------
// Module-level helpers — accept refs as arguments so they can be called from
// inside useCallback without polluting its dependency array.
// ---------------------------------------------------------------------------

function queueRawValue(
  value: Node | string,
  assertive: boolean,
  pendingValues: MutableRefObject<(Node | string)[]>,
  pendingAssertiveValues: MutableRefObject<string[]>,
  handleRef: MutableRefObject<AriaAnnouncerHandle | null>
): void {
  if (assertive) {
    const wasEmpty = pendingAssertiveValues.current.length === 0;
    pendingAssertiveValues.current.push(value as string);
    if (wasEmpty) {
      Promise.resolve().then(() =>
        flushPendingAssertiveValues(pendingAssertiveValues, handleRef)
      );
    }
    return;
  }

  const wasEmpty = pendingValues.current.length === 0;
  pendingValues.current.push(value);
  if (wasEmpty) {
    // The flush is scheduled as a microtask so that `nodeToText` runs after
    // the synchronous call stack drains — legacy callers (e.g.
    // `MessageComponent`) hand us a ref whose Lit descendants populate via
    // the event bus on the same tick.
    Promise.resolve().then(() => flushPendingValues(pendingValues, handleRef));
  }
}

/**
 * Awaits `updateComplete` on every `cds-aichat-markdown` element found inside
 * the given DOM node subtree. `cds-aichat-markdown` throttles its render to
 * 100 ms, so the polite-flush microtask fires before shadow-DOM content is
 * ready. Waiting here lets `nodeToText` see fully-rendered shadow trees.
 */
async function waitForMarkdownElements(node: Node): Promise<void> {
  if (!(node instanceof Element)) {
    return;
  }
  const markdownEls = Array.from(
    node.querySelectorAll<Element & { updateComplete?: Promise<boolean> }>(
      'cds-aichat-markdown'
    )
  );
  if (node.tagName?.toLowerCase() === 'cds-aichat-markdown') {
    markdownEls.unshift(
      node as Element & { updateComplete?: Promise<boolean> }
    );
  }
  await Promise.all(
    markdownEls.map((el) => el.updateComplete ?? Promise.resolve())
  );
}

async function flushPendingValues(
  pendingValues: MutableRefObject<(Node | string)[]>,
  handleRef: MutableRefObject<AriaAnnouncerHandle | null>
): Promise<void> {
  const queue = pendingValues.current;
  pendingValues.current = [];

  // Wait for any Lit markdown elements inside queued nodes to finish their
  // async rendering cycle before extracting text.
  await Promise.all(
    queue.map((entry) =>
      typeof entry === 'string'
        ? Promise.resolve()
        : waitForMarkdownElements(entry)
    )
  );

  const parts: string[] = [];
  queue.forEach((entry) => {
    if (typeof entry === 'string') {
      parts.push(entry);
    } else {
      nodeToText(entry, parts);
    }
  });

  const text = parts.join(' ');
  if (text && handleRef.current) {
    handleRef.current.announce(text, 'polite');
  }
}

function flushPendingAssertiveValues(
  pendingAssertiveValues: MutableRefObject<string[]>,
  handleRef: MutableRefObject<AriaAnnouncerHandle | null>
): void {
  const queue = pendingAssertiveValues.current;
  pendingAssertiveValues.current = [];

  const text = queue.filter(Boolean).join(' ');
  if (text && handleRef.current) {
    handleRef.current.announce(text, 'assertive');
  }
}

function hasNodeType(value: any): value is Node {
  return value.nodeType !== undefined;
}

// ---------------------------------------------------------------------------

/**
 * AriaAnnouncerProvider
 *
 * Provides the ARIA announcement function via context and mounts visually-hidden
 * live regions via the shared `mountAriaAnnouncer` helper. Subscribes to
 * `AppState.announceMessage` and announces whenever the value changes.
 *
 * Three polite regions are created (vs. two in `chat-shell`) because in earlier
 * testing FF + JAWS occasionally re-read entire region contents on append;
 * rotating across three ensures there is always a fresh region for the next
 * announcement. Two additional assertive regions back blocking-error
 * announcements. The rotation, dual-clear, and 250 ms NVDA debounce are all
 * owned by the shared `AriaAnnouncerManager`.
 */
function AriaAnnouncerProvider(props: HasChildren) {
  const intl = useIntl();
  const { store } = useServiceManager();

  const containerRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<AriaAnnouncerHandle | null>(null);

  /** Assertive announcements only ever come from resolved intl strings, so
   * this queue holds strings, never Nodes. */
  const pendingAssertiveValues = useRef<string[]>([]);

  /** Polite announcements may be Nodes (legacy callers hand us a ref whose Lit
   * descendants populate via the event bus on the same tick). */
  const pendingValues = useRef<(Node | string)[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return undefined;
    }
    const handle = mountAriaAnnouncer(container, {
      politeCount: 3,
      assertiveCount: 2,
    });
    handleRef.current = handle;
    return () => {
      handle.disconnect();
      handleRef.current = null;
    };
  }, []);

  const announcerFunction = useCallback<AriaAnnouncerFunctionType>(
    (value) => {
      if (!value) {
        return;
      }

      if (typeof value === 'string' || hasNodeType(value)) {
        queueRawValue(
          value,
          false,
          pendingValues,
          pendingAssertiveValues,
          handleRef
        );
      } else if ((value as AnnounceMessage).messageID) {
        queueRawValue(
          intl.formatMessage(
            { id: (value as AnnounceMessage).messageID },
            (value as AnnounceMessage).messageValues
          ),
          Boolean((value as AnnounceMessage).assertive),
          pendingValues,
          pendingAssertiveValues,
          handleRef
        );
      } else {
        queueRawValue(
          (value as AnnounceMessage).messageText,
          Boolean((value as AnnounceMessage).assertive),
          pendingValues,
          pendingAssertiveValues,
          handleRef
        );
      }
    },
    [intl, pendingValues, pendingAssertiveValues, handleRef]
  );

  const previousAnnounceMessageRef = useRef<AnnounceMessage | undefined>(
    undefined
  );

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentAnnounceMessage = store.getState().announceMessage;
      if (currentAnnounceMessage !== previousAnnounceMessageRef.current) {
        announcerFunction(currentAnnounceMessage);
        previousAnnounceMessageRef.current = currentAnnounceMessage;
      }
    });
    return unsubscribe;
  }, [store, announcerFunction]);

  return (
    <AriaAnnouncerContext.Provider value={announcerFunction}>
      {props.children}
      {/* aria-atomic is intentionally omitted (default off). See AriaAnnouncerOptions.ariaAtomic. */}
      <div
        ref={containerRef}
        className="cds-aichat--visually-hidden cds-aichat--aria-announcer"
      />
    </AriaAnnouncerContext.Provider>
  );
}

export { AriaAnnouncerProvider };
