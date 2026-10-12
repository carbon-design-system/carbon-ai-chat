/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Example: Carbon AI Chat — React 17 (legacy ReactDOM.render)
 *
 * Demonstrates: that `@carbon/ai-chat` runs on React 17 using the legacy
 * `ReactDOM.render` API (not `createRoot`). The "one thing" demonstrated
 * by this example is React 17 compatibility, not a chat feature.
 *
 * APIs exercised:
 *   - `ChatContainer` and `ChatCustomElement` (kept minimal so the framework
 *     glue is the focus)
 *   - `ReactDOM.render` from `react-dom`
 *
 * Start reading at: the `ReactDOM.render` call at the bottom of this file.
 */

import {
  ChatContainer,
  ChatCustomElement,
  PublicConfig,
} from '@carbon/ai-chat';
import React from 'react';
import ReactDOM from 'react-dom';

import { customSendMessage } from './customSendMessage';
import '@carbon/styles/css/styles.css';

const config: PublicConfig = {
  // route outbound messages through a local mock so the example runs without a backend; the React 17 mount path is the focus, not the messaging surface.
  messaging: {
    customSendMessage,
  },
};

// `?wrapper=custom` swaps the floating widget for a chat in a sized element, so one page covers both React components on React 17.
const showCustomElement =
  new URLSearchParams(window.location.search).get('wrapper') === 'custom';

/** The query-only fixture checks DOM props against this example's React version. */
function HostPropsProbe() {
  const [phase, setPhase] = React.useState('initial');
  const [lastClick, setLastClick] = React.useState('none');
  const [callbacks, setCallbacks] = React.useState<string[]>([]);
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
      <output data-testid="host-callbacks">
        {callbacks.join(',') || 'none'}
      </output>
      <ChatContainer
        {...config}
        {...hostProps}
        data-testid="props-host"
        onBeforeRender={() => setCallbacks((calls) => [...calls, 'before'])}
        onAfterRender={() => setCallbacks((calls) => [...calls, 'after'])}
      />
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

// React 17 ships `ReactDOM.render` as the supported mount API; the lint rule flags it as deprecated against React 18+ types, but this example exists specifically to prove React 17 compatibility, so we suppress the rule here rather than migrate to `createRoot`.
// eslint-disable-next-line react/no-deprecated -- this example intentionally demonstrates React 17's legacy render API
ReactDOM.render(<App />, document.querySelector('#root'));
