/**
 *
 * IBM Confidential
 *
 * (C) Copyright IBM Corp. 2024
 *
 * The source code for this program is not published or otherwise
 * divested of its trade secrets, irrespective of what has been
 * deposited with the U. S. Copyright Office
 *
 * US Government Users Restricted Rights - Use, duplication or
 * disclosure restricted by GSA ADP Schedule Contract with IBM Corp.
 *
 */

import {
  BusEventUserDefinedResponse,
  BusEventViewChange,
  ChatContainer,
  ChatCustomElement,
  ChatInstance,
  PublicConfig,
} from '@carbon/ai-chat';
import React, { useState } from 'react';

import { Settings } from '../framework/types';

interface AppProps {
  config: PublicConfig;
  settings: Settings;
  onBeforeRender: (instance: ChatInstance) => void;
}

function DemoApp({ config, settings, onBeforeRender }: AppProps) {
  const [sideBarOpen, setSideBarOpen] = useState(false);
  const onViewChange =
    settings.layout === 'sidebar'
      ? (event: BusEventViewChange, instance: ChatInstance) => {
          setSideBarOpen(event.newViewState.mainWindow);
        }
      : undefined;
  let className;
  if (settings.layout === 'fullscreen') {
    className = 'fullScreen';
  } else if (settings.layout === 'sidebar') {
    if (sideBarOpen) {
      className = 'sidebar';
    } else {
      className = 'sidebar sidebar--closed';
    }
  }
  return (
    <>
      {settings.layout === 'float' ? (
        <ChatContainer
          config={config}
          onBeforeRender={onBeforeRender}
          renderUserDefinedResponse={renderUserDefinedResponse}
        />
      ) : (
        <ChatCustomElement
          config={config}
          className={className}
          onViewChange={onViewChange}
          onBeforeRender={onBeforeRender}
          renderUserDefinedResponse={renderUserDefinedResponse}
        />
      )}
    </>
  );
}

function renderUserDefinedResponse(event: BusEventUserDefinedResponse, instance: ChatInstance) {
  // The event here will contain details for each user defined response that needs to be rendered.

  if (event.data.message.user_defined?.type === 'chart') {
    return <div className="padding">Any component you want.</div>;
  }

  return undefined;
}

export { DemoApp };
