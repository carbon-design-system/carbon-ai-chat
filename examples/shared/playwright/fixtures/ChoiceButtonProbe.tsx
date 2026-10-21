/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Query-only fixture for Boolean selection through the real ChatButton wrapper.
 * The host app supplies its React version; start with the query-selected import.
 */
import React from 'react';

const tree = new URLSearchParams(window.location.search).get('choice-tree');
const ChatButton = React.lazy(() =>
  tree === 'es-custom'
    ? import('@carbon/ai-chat-components/es-custom/react/chat-button.js')
    : import('@carbon/ai-chat-components/es/react/chat-button.js')
);

export default function ChoiceButtonProbe() {
  const [selectedIndex, setSelectedIndex] = React.useState<number | null>(null);
  const [calls, setCalls] = React.useState([0, 0]);

  function select(index: number) {
    setCalls((counts) => [
      counts[0] + Number(index === 0),
      counts[1] + Number(index === 1),
    ]);
    setSelectedIndex(index);
  }

  return (
    <main>
      <h1>Choice wrapper probe</h1>
      <output data-testid="choice-react-version">{React.version}</output>
      <button type="button">Before choices</button>
      <React.Suspense fallback={<p>Loading choices</p>}>
        {['First choice', 'Second choice'].map((label, index) => (
          <ChatButton
            key={label}
            data-testid={`choice-${index}`}
            isQuickAction
            isSelected={index === selectedIndex}
            onClick={() => select(index)}>
            {label}
          </ChatButton>
        ))}
      </React.Suspense>
      <button type="button" onClick={() => setSelectedIndex(null)}>
        Clear selection
      </button>
      <output data-testid="choice-calls">{calls.join(',')}</output>
    </main>
  );
}
