/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render, waitFor } from '@testing-library/react';
import SelectComponent from '../SelectComponent';
import {
  makeConfigStore,
  TestChatContext,
} from '../../../../__tests__/helpers/chat';

vi.mock('../../../helpers/TextBlock/TextBlock', () => ({
  TextBlock: ({ title, description }: any) => (
    <>
      <span>{title}</span>
      <span>{description}</span>
    </>
  ),
}));

describe('SelectComponent with Carbon dropdown', () => {
  it('sets unique item properties and restores exactly one selected item', async () => {
    const options = [
      { label: 'First', value: { input: { text: 'same' } } },
      { label: 'Second', value: { input: { text: 'same' } } },
    ];
    const { container } = render(
      <TestChatContext store={makeConfigStore({})}>
        <SelectComponent
          title="Choose one"
          description="Choice description"
          options={options}
          value={{
            input: { text: 'same' },
            history: { label: 'Second' },
          }}
          onChange={vi.fn()}
          disableUserInputs={false}
          serviceManager={{ namespace: { suffix: '' } } as any}
        />
      </TestChatContext>
    );

    const dropdown = container.querySelector('cds-dropdown') as HTMLElement & {
      updateComplete: Promise<unknown>;
      value: string;
    };
    const items = Array.from(
      container.querySelectorAll('cds-dropdown-item')
    ) as Array<HTMLElement & { selected: boolean; value: string }>;

    await waitFor(() => expect(dropdown.value).toBe('1'));
    await dropdown.updateComplete;

    expect(items.map((item) => item.value)).toEqual(['0', '1']);
    expect(items.map((item) => item.getAttribute('value'))).toEqual(['0', '1']);
    expect(items.map((item) => item.dataset.optionIndex)).toEqual(['0', '1']);
    expect(items.map((item) => item.selected)).toEqual([false, true]);
  });
});
