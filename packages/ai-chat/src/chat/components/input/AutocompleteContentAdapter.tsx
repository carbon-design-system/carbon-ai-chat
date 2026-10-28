/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useLayoutEffect, useReducer, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useSyncExternalStore } from 'use-sync-external-store/shim/index.js';
import type {
  AutocompleteContent,
  AutocompleteContentRecord,
} from '../../services/autocompleteContent';
import './NativeAutocomplete';

interface ContentBoundaryProps {
  contentOwner: AutocompleteContent;
  request: AutocompleteContentRecord;
  children: React.ReactNode;
}

class ContentBoundary extends React.Component<ContentBoundaryProps> {
  state = { failed: false, request: this.props.request };

  static getDerivedStateFromProps(
    props: ContentBoundaryProps,
    state: ContentBoundary['state']
  ) {
    return props.request === state.request
      ? null
      : { failed: false, request: props.request };
  }

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: Error) {
    this.props.contentOwner.fail(this.props.request, error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function AutocompleteContentAdapter({
  contentOwner,
}: {
  contentOwner: AutocompleteContent;
}) {
  const { request } = useSyncExternalStore(
    contentOwner.subscribe,
    contentOwner.getSnapshot,
    contentOwner.getSnapshot
  );
  const committed = useRef<{
    contentOwner: AutocompleteContent;
    request: AutocompleteContentRecord;
  }>(undefined);
  const [rootRevision, rootChanged] = useReducer(
    (value: number) => value + 1,
    0
  );
  const placed = request?.kind === 'react' && contentOwner.isPlaced(request);
  const previous = committed.current;
  const rendered = placed
    ? request
    : request?.kind === 'react' &&
        previous?.contentOwner === contentOwner &&
        previous.request.target === request.target
      ? previous.request
      : undefined;

  useLayoutEffect(() => {
    if (placed) {
      committed.current = { contentOwner, request };
    } else if (!rendered) {
      committed.current = undefined;
    }
  }, [contentOwner, request, placed, rendered]);

  const target = rendered?.target;
  useLayoutEffect(() => {
    if (!target) {
      return undefined;
    }
    let firstElement = target.firstElementChild;
    const observer = new MutationObserver(() => {
      const nextElement = target.firstElementChild;
      if (firstElement === nextElement) {
        return;
      }
      firstElement = nextElement;
      const current = committed.current;
      if (
        current?.contentOwner === contentOwner &&
        current.request === contentOwner.getSnapshot().request
      ) {
        contentOwner.invalidateReady(current.request);
        rootChanged();
      }
    });
    observer.observe(target, { childList: true });
    return () => observer.disconnect();
  }, [contentOwner, target]);

  useEffect(() => {
    if (!placed) {
      return undefined;
    }
    void contentOwner
      .commit(request)
      .catch((error) => contentOwner.fail(request, error));
    return () => contentOwner.invalidateReady(request);
  }, [contentOwner, request, placed, rootRevision]);

  return rendered
    ? createPortal(
        <ContentBoundary contentOwner={contentOwner} request={rendered}>
          {rendered.content as React.ReactNode}
        </ContentBoundary>,
        rendered.target,
        'autocomplete'
      )
    : null;
}

export { AutocompleteContentAdapter };
