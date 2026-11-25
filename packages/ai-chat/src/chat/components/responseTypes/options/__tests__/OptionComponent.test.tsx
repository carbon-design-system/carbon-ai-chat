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
import { OptionItemComponent } from '../OptionComponent';
import {
  makeConfigStore,
  TestChatContext,
} from '../../../../__tests__/helpers/chat';
import {
  MessageResponseTypes,
  OptionItemPreference,
} from '../../../../../types/messaging/Messages';

// The real text block renders markdown into a shadow root; plain spans keep
// the title and description queryable.
vi.mock('../../../helpers/TextBlock/TextBlock', () => ({
  TextBlock: ({ title, description }: any) => (
    <>
      <span>{title}</span>
      <span>{description}</span>
    </>
  ),
}));

function renderOptions(
  options: any[],
  preference = OptionItemPreference.BUTTON
) {
  // The item has no view flags, so it shows no recorded choice.
  const serviceManager = {
    store: makeConfigStore({}),
    namespace: { suffix: '' },
    actions: { sendWithCatch: vi.fn() },
    publicStateService: { messageItemIDOf: (): undefined => undefined },
  } as any;
  const localMessage = {
    item: {
      response_type: MessageResponseTypes.OPTION,
      title: 'Choose one',
      description: 'Choice description',
      preference,
      options,
    },
    fullMessageID: 'response-id',
    ui_state: { id: 'local-id' },
  } as any;

  return render(
    <TestChatContext serviceManager={serviceManager}>
      <OptionItemComponent
        localMessage={localMessage}
        originalMessage={{ id: 'response-id' } as any}
        disableUserInputs={false}
        requestInputFocus={vi.fn()}
        serviceManager={serviceManager}
      />
    </TestChatContext>
  );
}

it('renders title and description but no control when every option is invalid', () => {
  const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  const { container } = renderOptions([
    { label: '', value: { input: { text: '' } } },
  ]);

  // The mocked text block's two spans are all that renders.
  expect(Array.from(container.children, (child) => child.tagName)).toEqual([
    'SPAN',
    'SPAN',
  ]);
  expect(screen.getByText('Choose one')).toBeInTheDocument();
  expect(screen.getByText('Choice description')).toBeInTheDocument();
  expect(screen.queryByRole('button')).not.toBeInTheDocument();
  expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
  expect(consoleSpy).toHaveBeenCalledWith(
    expect.stringContaining(
      'An option has no label or input text, so the chat did not render it.'
    )
  );
  consoleSpy.mockRestore();
});
