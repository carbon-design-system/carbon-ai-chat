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
import { ButtonItemCustomEventComponent } from '../ButtonItemCustomEventComponent';
import { ButtonItemPostBackComponent } from '../ButtonItemPostBackComponent';
import { ButtonItemShowPanelComponent } from '../ButtonItemShowPanelComponent';
import { ButtonItemURLComponent } from '../ButtonItemURLComponent';
import {
  makeConfigStore,
  TestChatContext,
} from '../../../../__tests__/helpers/chat';
import {
  ButtonItemType,
  MessageResponseTypes,
} from '../../../../../types/messaging/Messages';

// A minimal Carbon icon descriptor that is easy to tell apart from the built-in default icons.
const CUSTOM_ICON = {
  elem: 'svg',
  attrs: { viewBox: '0 0 16 16', 'data-icon': 'custom' },
  content: [{ elem: 'path', attrs: { d: 'M0 0h16v16H0z' } }],
} as any;

const CUSTOM_ICON_SELECTOR = 'svg[data-icon="custom"]';
const HIDDEN_LABEL_SELECTOR = '.cds-aichat--visually-hidden';
const HIDDEN_LABEL_CLASS_SELECTOR = '.cds-aichat--button-item--hidden-label';

const ICON_ALIGNMENTS = ['start', 'center', 'end'] as const;

const COMMON_ITEM = {
  response_type: MessageResponseTypes.BUTTON,
  label: 'Visible label',
};

interface ButtonCase {
  name: string;
  item: Record<string, unknown>;
  renderComponent: (localMessageItem: any) => React.ReactElement;
}

const CASES: ButtonCase[] = [
  {
    name: 'post_back',
    item: {
      ...COMMON_ITEM,
      button_type: ButtonItemType.POST_BACK,
      value: { input: { text: 'sent text' } },
    },
    renderComponent: (localMessageItem) => (
      <ButtonItemPostBackComponent
        localMessageItem={localMessageItem}
        isMessageForInput={true}
        requestFocus={vi.fn()}
      />
    ),
  },
  {
    name: 'custom_event',
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

const CASES_WITHOUT_DEFAULT_ICON = CASES.filter(({ name }) => name !== 'url');

function getCase(name: string): ButtonCase {
  return CASES.find((buttonCase) => buttonCase.name === name);
}

function renderButton(
  { item, renderComponent }: ButtonCase,
  overrides: Record<string, unknown> = {}
) {
  const localMessageItem = {
    item: { ...item, ...overrides },
    fullMessageID: 'response-id',
    ui_state: { id: 'local-id' },
  } as any;
  // useSelector reads the real store; dispatches go to the mock.
  const serviceManager = {
    store: { ...makeConfigStore({}), dispatch: vi.fn() },
    actions: { sendWithCatch: vi.fn() },
    fire: vi.fn(),
  } as any;

  return render(
    <TestChatContext serviceManager={serviceManager}>
      {renderComponent(localMessageItem)}
    </TestChatContext>
  );
}

describe('url button of kind LINK without `image_url`', () => {
  const urlCase = getCase('url');

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

describe.each(CASES)('$name button with `hide_label`', (buttonCase) => {
  const hiddenLabelItem = { icon: CUSTOM_ICON, hide_label: true };

  it('keeps the label in the DOM as visually hidden text', () => {
    const { container } = renderButton(buttonCase, hiddenLabelItem);

    expect(container.querySelector(HIDDEN_LABEL_SELECTOR)).toHaveTextContent(
      'Visible label'
    );
    expect(
      container.querySelector(HIDDEN_LABEL_CLASS_SELECTOR)
    ).toBeInTheDocument();
  });

  it('hides the icon from assistive technology so the label is announced once', () => {
    const { container } = renderButton(buttonCase, hiddenLabelItem);

    expect(container.querySelector(CUSTOM_ICON_SELECTOR)).toHaveAttribute(
      'aria-hidden',
      'true'
    );
  });

  // Icon alignment and its default are covered once, on post_back.
  if (buttonCase.name !== 'post_back') {
    return;
  }

  it.each(ICON_ALIGNMENTS)('applies the %s alignment class', (alignment) => {
    const { container } = renderButton(buttonCase, {
      ...hiddenLabelItem,
      icon_alignment: alignment,
    });

    expect(
      container.querySelector(`.cds-aichat--button-item--icon-${alignment}`)
    ).toBeInTheDocument();
  });

  it('defaults the alignment to end', () => {
    const { container } = renderButton(buttonCase, hiddenLabelItem);

    expect(
      container.querySelector('.cds-aichat--button-item--icon-end')
    ).toBeInTheDocument();
  });
});

describe('`hide_label` without an icon', () => {
  it.each(CASES_WITHOUT_DEFAULT_ICON)(
    '$name keeps the visible label',
    (buttonCase) => {
      const { container } = renderButton(buttonCase, { hide_label: true });

      expect(container.querySelector(HIDDEN_LABEL_SELECTOR)).toBeNull();
      expect(container).toHaveTextContent('Visible label');
    }
  );
});

describe('hidden accessible name fallbacks', () => {
  it('uses `value.input.text` for a post_back button with no label', () => {
    const { container } = renderButton(getCase('post_back'), {
      label: undefined,
      icon: CUSTOM_ICON,
      hide_label: true,
    });

    expect(container.querySelector(HIDDEN_LABEL_SELECTOR)).toHaveTextContent(
      'sent text'
    );
  });

  it('uses the URL for a url button with no label', () => {
    const { container } = renderButton(getCase('url'), {
      label: undefined,
      icon: CUSTOM_ICON,
      hide_label: true,
    });

    expect(container.querySelector(HIDDEN_LABEL_SELECTOR)).toHaveTextContent(
      'https://example.com'
    );
  });
});
