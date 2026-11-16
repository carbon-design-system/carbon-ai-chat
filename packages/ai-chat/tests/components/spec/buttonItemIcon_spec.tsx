/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ButtonItemCustomEventComponent } from '../../../src/chat/components/responseTypes/button/ButtonItemCustomEventComponent';
import { ButtonItemPostBackComponent } from '../../../src/chat/components/responseTypes/button/ButtonItemPostBackComponent';
import { ButtonItemShowPanelComponent } from '../../../src/chat/components/responseTypes/button/ButtonItemShowPanelComponent';
import { ButtonItemURLComponent } from '../../../src/chat/components/responseTypes/button/ButtonItemURLComponent';
import { ServiceManagerContext } from '../../../src/chat/contexts/ServiceManagerContext';
import { StoreProvider } from '../../../src/chat/providers/StoreProvider';
import { makeConfigStore } from '../../test_helpers';
import {
  ButtonItemType,
  MessageResponseTypes,
} from '../../../src/types/messaging/Messages';

// A minimal Carbon icon descriptor that is easy to tell apart from the built-in default icons.
const CUSTOM_ICON = {
  elem: 'svg',
  attrs: { viewBox: '0 0 16 16', 'data-icon': 'custom' },
  content: [{ elem: 'path', attrs: { d: 'M0 0h16v16H0z' } }],
} as any;

const CUSTOM_ICON_SELECTOR = 'svg[data-icon="custom"]';

const COMMON_ITEM = {
  response_type: MessageResponseTypes.BUTTON,
  label: 'Visible label',
};

interface ButtonCase {
  name: string;
  /** Whether the component shows a default icon when `image_url` is set and no custom icon is given. */
  defaultIconWithImage: boolean;
  item: Record<string, unknown>;
  renderComponent: (localMessageItem: any) => React.ReactElement;
}

const CASES: ButtonCase[] = [
  {
    name: 'post_back',
    defaultIconWithImage: true,
    item: {
      ...COMMON_ITEM,
      button_type: ButtonItemType.POST_BACK,
      value: { input: { text: 'sent text' } },
    },
    renderComponent: (localMessageItem) => (
      <ButtonItemPostBackComponent
        localMessageItem={localMessageItem}
        isMessageForInput={true}
        requestFocus={jest.fn()}
      />
    ),
  },
  {
    name: 'custom_event',
    defaultIconWithImage: true,
    item: {
      ...COMMON_ITEM,
      button_type: ButtonItemType.CUSTOM_EVENT,
      custom_event_name: 'my_event',
    },
    renderComponent: (localMessageItem) => (
      <ButtonItemCustomEventComponent
        localMessageItem={localMessageItem}
        fullMessage={{} as any}
      />
    ),
  },
  {
    name: 'show_panel',
    defaultIconWithImage: true,
    item: {
      ...COMMON_ITEM,
      button_type: ButtonItemType.SHOW_PANEL,
      panel: { title: 'Panel', body: [] },
    },
    renderComponent: (localMessageItem) => (
      <ButtonItemShowPanelComponent
        localMessageItem={localMessageItem}
        isMessageForInput={true}
      />
    ),
  },
  {
    name: 'url',
    defaultIconWithImage: true,
    item: {
      ...COMMON_ITEM,
      button_type: ButtonItemType.URL,
      url: 'https://example.com',
    },
    renderComponent: (localMessageItem) => (
      <ButtonItemURLComponent localMessageItem={localMessageItem} />
    ),
  },
];

function renderButton(
  { item, renderComponent }: ButtonCase,
  overrides: Record<string, unknown> = {}
) {
  const localMessageItem = {
    item: { ...item, ...overrides },
    fullMessageID: 'response-id',
    ui_state: { id: 'local-id' },
  } as any;
  const serviceManager = {
    store: { dispatch: jest.fn() },
    actions: { sendWithCatch: jest.fn() },
    fire: jest.fn(),
  } as any;

  return render(
    <StoreProvider store={makeConfigStore({})}>
      <ServiceManagerContext.Provider value={serviceManager}>
        {renderComponent(localMessageItem)}
      </ServiceManagerContext.Provider>
    </StoreProvider>
  );
}

describe.each(CASES)('$name button icon', (buttonCase) => {
  it('renders the custom icon when `icon` is provided', () => {
    const { container } = renderButton(buttonCase, { icon: CUSTOM_ICON });

    const customIcon = container.querySelector(CUSTOM_ICON_SELECTOR);
    expect(customIcon).toBeInTheDocument();
    expect(customIcon).toHaveAttribute('slot', 'icon');
  });

  it('renders the custom icon instead of the default when `image_url` is also set', () => {
    const { container } = renderButton(buttonCase, {
      icon: CUSTOM_ICON,
      image_url: 'https://example.com/image.png',
    });

    expect(container.querySelector(CUSTOM_ICON_SELECTOR)).toBeInTheDocument();
    expect(container.querySelectorAll('svg')).toHaveLength(1);
  });

  it('keeps the default icon when `icon` is absent and `image_url` is set', () => {
    const { container } = renderButton(buttonCase, {
      image_url: 'https://example.com/image.png',
    });

    expect(container.querySelector(CUSTOM_ICON_SELECTOR)).toBeNull();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });
});

describe('icon defaults without `image_url`', () => {
  it.each(CASES.filter(({ name }) => name !== 'url'))(
    '$name renders no icon when `icon` is absent',
    (buttonCase) => {
      const { container } = renderButton(buttonCase);

      expect(container.querySelector('svg')).toBeNull();
    }
  );

  it('url keeps the default Launch icon when `icon` is absent', () => {
    const { container } = renderButton(
      CASES.find(({ name }) => name === 'url')
    );

    expect(container.querySelector('svg')).toBeInTheDocument();
    expect(container.querySelector(CUSTOM_ICON_SELECTOR)).toBeNull();
  });
});

describe('url button of kind LINK without `image_url`', () => {
  const urlCase = CASES.find(({ name }) => name === 'url');

  it('renders the custom icon and labels it with the link text', () => {
    const { container } = renderButton(urlCase, {
      kind: 'LINK',
      icon: CUSTOM_ICON,
    });

    const customIcon = container.querySelector(CUSTOM_ICON_SELECTOR);
    expect(customIcon).toBeInTheDocument();
    expect(customIcon).toHaveAttribute('aria-label', 'Visible label');
  });

  it('keeps the default Launch icon when `icon` is absent', () => {
    const { container } = renderButton(urlCase, { kind: 'LINK' });

    expect(container.querySelector(CUSTOM_ICON_SELECTOR)).toBeNull();
    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-label',
      'Launch'
    );
  });
});
