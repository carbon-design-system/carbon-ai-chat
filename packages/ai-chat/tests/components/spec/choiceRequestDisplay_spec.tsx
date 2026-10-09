/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MessageTypeComponent } from '../../../src/chat/components-legacy/MessageTypeComponent';
import { IntlProvider } from '../../../src/chat/providers/IntlProvider';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { createIntl } from '../../../src/chat/utils/i18n';
import { makeConfigStore } from '../../test_helpers';
import {
  MessageRequestHistory,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

jest.mock(
  '../../../src/chat/components/helpers/MarkdownWithDefaults/MarkdownWithDefaults',
  () => ({
    MarkdownWithDefaults: ({ text }: { text: string }) => (
      <span data-testid="plain-request">{text}</span>
    ),
  })
);

jest.mock('../../../src/chat/components-legacy/MessageRichUserContent', () => ({
  MessageRichUserContent: () => <span data-testid="rich-request">rich</span>,
}));

const intl = createIntl({ locale: 'en', messages: {} });

function renderRequest(history: MessageRequestHistory) {
  const originalMessage = {
    id: 'request-id',
    input: {
      text: 'sent text',
      display_content: {
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'rich' }] },
        ],
      },
    },
    history,
  } as any;
  const message = {
    item: { response_type: MessageResponseTypes.TEXT, text: 'sent text' },
    fullMessageID: 'request-id',
    ui_state: { id: 'local-id', originalUserText: history.label },
  } as any;

  render(
    <StoreProvider store={makeConfigStore({})}>
      <IntlProvider intl={intl}>
        <MessageTypeComponent
          message={message}
          originalMessage={originalMessage}
          serviceManager={{} as any}
          requestInputFocus={jest.fn()}
          disableUserInputs={false}
          isMessageForInput={false}
          scrollElementIntoView={jest.fn()}
          showChainOfThought={false}
          hideFeedback
          allowNewFeedback={false}
        />
      </IntlProvider>
    </StoreProvider>
  );
}

describe('choice request transcript rendering', () => {
  it('uses the resolved history label instead of preserved rich content', () => {
    renderRequest({
      label: 'Resolved choice label',
      related_message_id: 'response-id',
      is_choice_request: true,
    });

    expect(screen.getByTestId('plain-request')).toHaveTextContent(
      'Resolved choice label'
    );
    expect(screen.queryByTestId('rich-request')).not.toBeInTheDocument();
  });

  it.each([undefined, false])(
    'keeps rich content when related history has is_choice_request=%s',
    (is_choice_request) => {
      renderRequest({
        label: 'Host label',
        related_message_id: 'response-id',
        is_choice_request,
      });

      expect(screen.getByTestId('rich-request')).toBeInTheDocument();
      expect(screen.queryByTestId('plain-request')).not.toBeInTheDocument();
    }
  );

  it('keeps rich content for a general request with only a history label', () => {
    renderRequest({ label: 'Host label' });

    expect(screen.getByTestId('rich-request')).toBeInTheDocument();
    expect(screen.queryByTestId('plain-request')).not.toBeInTheDocument();
  });
});
