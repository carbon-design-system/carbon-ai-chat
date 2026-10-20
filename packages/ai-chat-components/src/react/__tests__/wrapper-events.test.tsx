/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { act, render } from '@testing-library/react';
import Autocomplete from '@carbon/ai-chat-components/es/react/autocomplete.js';
import AutocompleteController from '@carbon/ai-chat-components/es/react/autocomplete-controller.js';
import CodeSnippet from '@carbon/ai-chat-components/es/react/code-snippet.js';
import ChainOfThought from '@carbon/ai-chat-components/es/react/chain-of-thought.js';
import HistoryShell from '@carbon/ai-chat-components/es/react/history/history-shell.js';
import PromptLineShell from '@carbon/ai-chat-components/es/react/prompt-line-shell.js';
import ReasoningStep from '@carbon/ai-chat-components/es/react/reasoning-step.js';
import ReasoningSteps from '@carbon/ai-chat-components/es/react/reasoning-steps.js';
import { WorkspaceShellHeader } from '@carbon/ai-chat-components/es/react/workspace-shell.js';

type Handler = (event: Event) => void;
type Binding = {
  name: string;
  tag: string;
  detail: unknown;
  view: (handler?: Handler) => React.ReactElement;
};

const bindings: Binding[] = [
  {
    name: 'chain-of-thought-toggled',
    tag: 'cds-aichat-chain-of-thought',
    detail: { open: true },
    view: (handler) => <ChainOfThought onToggle={handler} />,
  },
  {
    name: 'chain-of-thought-step-toggled',
    tag: 'cds-aichat-chain-of-thought',
    detail: { open: true },
    view: (handler) => <ChainOfThought onStepToggle={handler} />,
  },
  {
    name: 'code-snippet-render-end',
    tag: 'cds-aichat-code-snippet',
    detail: null,
    view: (handler) => <CodeSnippet onRenderEnd={handler} />,
  },
  {
    name: 'workspace-header-toggle',
    tag: 'cds-aichat-workspace-shell-header',
    detail: { open: true },
    view: (handler) => <WorkspaceShellHeader onHeaderToggle={handler} />,
  },
  {
    name: 'history-item-selected',
    tag: 'cds-aichat-history-shell',
    detail: {
      itemId: 'row',
      itemName: 'A chat',
      element: document.createElement('div'),
    },
    view: (handler) => <HistoryShell onSelected={handler} />,
  },
  {
    name: 'reasoning-animation-start',
    tag: 'cds-aichat-reasoning-steps',
    detail: { open: false },
    view: (handler) => <ReasoningSteps onAnimationStart={handler} />,
  },
  {
    name: 'reasoning-animation-end',
    tag: 'cds-aichat-reasoning-steps',
    detail: { open: true },
    view: (handler) => <ReasoningSteps onAnimationEnd={handler} />,
  },
  {
    name: 'reasoning-animation-end',
    tag: 'cds-aichat-reasoning-step',
    detail: { open: true },
    view: (handler) => <ReasoningStep onAnimationEnd={handler} />,
  },
  {
    name: 'cds-aichat-autocomplete-navigated',
    tag: 'cds-aichat-autocomplete',
    detail: { navigated: true },
    view: (handler) => <Autocomplete onAutocompleteNavigated={handler} />,
  },
  {
    name: 'cds-aichat-autocomplete-navigated',
    tag: 'cds-aichat-prompt-line-shell',
    detail: { navigated: true },
    view: (handler) => <PromptLineShell onAutocompleteNavigated={handler} />,
  },
  {
    name: 'cds-aichat-starter-selected',
    tag: 'cds-aichat-autocomplete-controller',
    detail: { text: 'Hello' },
    view: (handler) => <AutocompleteController onStarterSelected={handler} />,
  },
  {
    name: 'cds-aichat-autocomplete-item-selected',
    tag: 'cds-aichat-autocomplete-controller',
    detail: { item: { id: 'one', text: 'One' } },
    view: (handler) => <AutocompleteController onSelectItem={handler} />,
  },
  {
    name: 'cds-aichat-autocomplete-item-send',
    tag: 'cds-aichat-autocomplete-controller',
    detail: { text: 'Hello' },
    view: (handler) => <AutocompleteController onSendItem={handler} />,
  },
  {
    name: 'cds-aichat-list-navigated',
    tag: 'cds-aichat-autocomplete-controller',
    detail: { navigated: true },
    view: (handler) => <AutocompleteController onListNavigated={handler} />,
  },
  {
    name: 'cds-aichat-autocomplete-navigated',
    tag: 'cds-aichat-autocomplete-controller',
    detail: { navigated: true },
    view: (handler) => (
      <AutocompleteController onAutocompleteNavigated={handler} />
    ),
  },
  {
    name: 'cds-aichat-custom-list-render',
    tag: 'cds-aichat-autocomplete-controller',
    detail: { reactNode: 'Custom list' },
    view: (handler) => <AutocompleteController onCustomListRender={handler} />,
  },
];

test.each(bindings)(
  '$tag forwards $name and updates its listener',
  async ({ name, tag, detail, view }) => {
    const first = jest.fn((_event: Event) => {});
    const second = jest.fn((_event: Event) => {});
    const { container, rerender } = render(view(first));
    const host = container.querySelector(tag)!;
    expect(host).not.toBeNull();
    const dispatch = () => {
      const event = new CustomEvent(name, {
        detail,
        bubbles: true,
        composed: true,
      });
      act(() => {
        host.dispatchEvent(event);
      });
      return event;
    };
    const initial = dispatch();
    expect(
      first.mock.calls.filter(([event]) => event === initial)
    ).toHaveLength(1);
    expect(
      (first.mock.calls.find(([event]) => event === initial)![0] as CustomEvent)
        .detail
    ).toBe(detail);

    rerender(view(second));
    const replaced = dispatch();
    expect(first.mock.calls.some(([event]) => event === replaced)).toBe(false);
    expect(
      second.mock.calls.filter(([event]) => event === replaced)
    ).toHaveLength(1);

    rerender(view());
    const removed = dispatch();
    expect(first.mock.calls.some(([event]) => event === removed)).toBe(false);
    expect(second.mock.calls.some(([event]) => event === removed)).toBe(false);
  }
);
