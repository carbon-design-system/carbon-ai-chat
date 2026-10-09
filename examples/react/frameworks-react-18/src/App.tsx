/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — React 18 (createRoot)
 *
 * Demonstrates: that `@carbon/ai-chat` runs on React 18, mounted with the
 * app's own `createRoot`. The "one thing" demonstrated by this example is
 * React 18 compatibility, not a chat feature.
 *
 * APIs exercised:
 *   - `ChatContainer` and `ChatCustomElement` (kept minimal so the framework
 *     glue is the focus)
 *   - `createRoot` from `react-dom/client`
 *
 * Start reading at: the `createRoot` call at the bottom of this file.
 */

import {
  ChatContainer,
  ChatCustomElement,
  PublicConfig,
} from '@carbon/ai-chat';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  // route outbound messages through a local mock so the example runs without a backend; the React 18 mount path is the focus, not the messaging surface.
  messaging: {
    customSendMessage,
  },
};

// `?wrapper=custom` swaps the floating widget for a chat in a sized element, so one page covers both React components on React 18.
const showCustomElement =
  new URLSearchParams(window.location.search).get('wrapper') === 'custom';

/** The query-only fixture checks DOM props against this example's React version. */
function HostPropsProbe() {
  const [phase, setPhase] = React.useState('initial');
  const [lastClick, setLastClick] = React.useState('none');
  const updated = phase === 'updated';
  const hostProps: React.HTMLAttributes<HTMLElement> =
    phase === 'omitted'
      ? {}
      : {
          id: `host-${phase}`,
          className: `host-${phase}`,
          title: phase,
          hidden: updated,
          draggable: !updated,
          spellCheck: !updated,
          contentEditable: updated,
          tabIndex: updated ? 3 : 2,
          'aria-label': phase,
          'aria-hidden': updated,
          style: updated ? { padding: '4px' } : { color: 'rgb(1, 2, 3)' },
          onClick: (event) =>
            setLastClick(`${phase}:${event.currentTarget.localName}`),
        };

  return (
    <>
      <button type="button" onClick={() => setPhase('updated')}>
        Update host props
      </button>
      <button type="button" onClick={() => setPhase('omitted')}>
        Remove host props
      </button>
      <output data-testid="host-click">{lastClick}</output>
      <ChatContainer {...config} {...hostProps} data-testid="props-host" />
    </>
  );
}

function App() {
  if (new URLSearchParams(window.location.search).has('host-props')) {
    return <HostPropsProbe />;
  }
  if (showCustomElement) {
    return (
      <ChatCustomElement
        {...config}
        className="chat-custom-element"
        layout={{ showFrame: false }}
        openChatByDefault
      />
    );
  }
  return <ChatContainer {...config} />;
}

createRoot(document.querySelector('#root') as HTMLElement).render(<App />);
