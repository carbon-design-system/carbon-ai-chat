/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { createComponent, type EventName } from '@lit/react';
import { withWebComponentBridge } from '@carbon/ai-chat-components/es/react/utils/withWebComponentBridge.js';
import { InlineError } from '../responseTypes/error/InlineError';
import IFrameBody, { type IFramePanelMessage } from './native/IFrameBody';
import { PanelBodyContentAdapter } from './PanelBodyContentAdapter';
import type {
  PanelBodyContentDetail,
  PanelBodyContentReadyEvent,
} from './native/panelBodyContent';

interface IFramePanelProps {
  messageItem?: IFramePanelMessage;
}

const nativeIFrameBodyEvents = {
  onPanelContentReady:
    'panel-content-ready' as EventName<PanelBodyContentReadyEvent>,
};

// The bridge sets the view's properties in DOM shims, where @lit/react's node
// build passes them only to server rendering.
const NativeIFrameBody = withWebComponentBridge(
  createComponent({
    tagName: 'cds-aichat-iframe-body',
    elementClass: IFrameBody,
    react: React,
    events: nativeIFrameBodyEvents,
  }),
  { events: nativeIFrameBodyEvents }
);

const IFramePanel = ({ messageItem }: IFramePanelProps) => {
  const [content, setContent] = useState<PanelBodyContentDetail>();
  const active = useRef(true);
  useLayoutEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
    };
  }, []);
  const onContentReady = useCallback((event: PanelBodyContentReadyEvent) => {
    if (active.current) {
      const next = event.detail ?? undefined;
      setContent((previous) =>
        previous?.target === next?.target && previous?.text === next?.text
          ? previous
          : next
      );
    }
  }, []);
  return (
    <>
      <NativeIFrameBody
        messageItem={messageItem}
        onPanelContentReady={onContentReady}
      />
      {content && (
        <PanelBodyContentAdapter target={content.target}>
          <InlineError text={content.text} />
        </PanelBodyContentAdapter>
      )}
    </>
  );
};

export default IFramePanel;
