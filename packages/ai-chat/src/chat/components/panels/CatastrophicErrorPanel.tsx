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
  useRef,
  useState,
} from 'react';
import { createComponent } from '@lit/react';
import { MarkdownWithDefaults } from '../helpers/MarkdownWithDefaults/MarkdownWithDefaults';
import { PanelBodyContentAdapter } from './PanelBodyContentAdapter';
import {
  ErrorBody,
  type CatastrophicErrorPanelProps,
} from './native/ErrorBody';
import type {
  PanelBodyContentDetail,
  PanelBodyContentReadyEvent,
} from './native/panelBodyContent';
import { useChatViewStateInstance } from '../../hooks/useChatViewState';

const NativeErrorBody = createComponent({
  tagName: 'cds-aichat-error-body',
  elementClass: ErrorBody,
  react: React,
  events: { onPanelContentReady: 'panel-content-ready' },
});

function CatastrophicErrorPanel({
  title,
  ...props
}: CatastrophicErrorPanelProps) {
  const viewState = useChatViewStateInstance();
  const releaseInitialCommit = useRef<() => void>(undefined);
  const [content, setContent] = useState<PanelBodyContentDetail | null>();
  useLayoutEffect(() => {
    const release = viewState.holdInitialReactCommit();
    releaseInitialCommit.current = release;
    return release;
  }, [viewState]);
  useEffect(() => {
    if (content !== undefined) {
      releaseInitialCommit.current?.();
    }
  }, [content, viewState]);
  const onPanelContentReady = useCallback(
    (event: PanelBodyContentReadyEvent) => {
      const next = event.detail;
      setContent((current) =>
        current !== undefined &&
        current?.target === next?.target &&
        current?.text === next?.text
          ? current
          : next
      );
    },
    []
  );

  return (
    <>
      <NativeErrorBody
        {...props}
        panelTitle={title}
        onPanelContentReady={onPanelContentReady}
      />
      {content && (
        <PanelBodyContentAdapter target={content.target}>
          <MarkdownWithDefaults text={content.text} highlight />
        </PanelBodyContentAdapter>
      )}
    </>
  );
}

export default CatastrophicErrorPanel;
