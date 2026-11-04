/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import messages from '../../../packages/ai-chat/src/chat/languages/en.json';

// Keep the package source under its own TypeScript settings, not the demo's strict settings.
const modules = import.meta.glob<Record<string, unknown>>([
  '../../../packages/ai-chat/src/chat/components/responseTypes/conversationalSearch/ConversationalSearch.tsx',
  '../../../packages/ai-chat/src/chat/contexts/StoreContext.tsx',
  '../../../packages/ai-chat/src/chat/contexts/IntlContext.ts',
  '../../../packages/ai-chat/src/chat/contexts/WindowSizeContext.tsx',
  '../../../packages/ai-chat/src/chat/utils/i18n.ts',
]);

export async function mountConversationalSearch(root: HTMLElement) {
  const componentModule =
    await modules[
      '../../../packages/ai-chat/src/chat/components/responseTypes/conversationalSearch/ConversationalSearch.tsx'
    ]();
  const storeModule =
    await modules[
      '../../../packages/ai-chat/src/chat/contexts/StoreContext.tsx'
    ]();
  const intlModule =
    await modules[
      '../../../packages/ai-chat/src/chat/contexts/IntlContext.ts'
    ]();
  const formatterModule =
    await modules['../../../packages/ai-chat/src/chat/utils/i18n.ts']();
  const windowModule =
    await modules[
      '../../../packages/ai-chat/src/chat/contexts/WindowSizeContext.tsx'
    ]();
  const state = {
    languagePack: messages,
    config: { public: { locale: 'en', shouldSanitizeHTML: true } },
  };
  const store = {
    getState: () => state,
    subscribe: () => () => undefined,
    dispatch: (action: unknown) => action,
  };
  const item = {
    fullMessageID: 'fixture-response',
    item: {
      response_type: 'conversational_search',
      text: 'An answer with a citation.',
      citations: [
        { title: 'Source', text: 'Citation', url: 'https://example.com' },
      ],
    },
    ui_state: { id: 'fixture-item' },
  };
  const ConversationalSearch =
    componentModule.ConversationalSearch as React.ComponentType<
      Record<string, unknown>
    >;
  const StoreContext = storeModule.StoreContext as React.Context<typeof store>;
  const IntlContext = intlModule.IntlContext as React.Context<unknown>;
  const WindowSizeContext = windowModule.WindowSizeContext as React.Context<{
    width: number;
    height: number;
  }>;
  const createIntl = formatterModule.createIntl as (config: {
    locale: string;
    messages: Record<string, string>;
  }) => unknown;
  createRoot(root).render(
    React.createElement(
      StoreContext.Provider,
      { value: store },
      React.createElement(
        IntlContext.Provider,
        { value: createIntl({ locale: 'en', messages }) },
        React.createElement(
          WindowSizeContext.Provider,
          { value: { width: innerWidth, height: innerHeight } },
          React.createElement(ConversationalSearch, {
            localMessageItem: item,
            scrollElementIntoView: () => undefined,
            isStreamingError: false,
          })
        )
      )
    )
  );
}
