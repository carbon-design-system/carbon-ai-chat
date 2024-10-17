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

import { BusEventUserDefinedResponse, ChatContainer, ChatInstance, PublicConfig } from '@carbon/ai-chat';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { customSendMessage } from './customSendMessage';

const config: PublicConfig = {
  messaging: {
    customSendMessage,
  },
  debug: true,
} as PublicConfig;

function App() {
  return <ChatContainer config={config} renderUserDefinedResponse={renderUserDefinedResponse} />;
}

function renderUserDefinedResponse(event: BusEventUserDefinedResponse, instance: ChatInstance) {
  // The event here will contain details for each user defined response that needs to be rendered.

  if (event.data.message.user_defined?.type === 'chart') {
    return <div className="padding">Any component you want.</div>;
  }

  return undefined;
}

const root = createRoot(document.querySelector('#root'));

root.render(<App />);
