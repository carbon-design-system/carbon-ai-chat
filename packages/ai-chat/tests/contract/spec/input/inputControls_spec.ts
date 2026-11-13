/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { act, waitFor } from '@testing-library/react';
import Add16 from '@carbon/icons/es/add/16.js';

import {
  MessageSendSource,
  PageObjectId,
  PublicConfig,
} from '../../../../src/aiChatEntry';
import {
  allByRole,
  byRole,
  byTestId,
  click,
  contractSetup,
  getByTestId,
  inputField,
  isDisabled,
  openChat,
  pause,
  shownText,
  typeText,
} from '../../helpers';

const STRINGS = {
  input_actionsMenuLabel: 'Contract input actions',
  input_maxCharCountExceededTitle: 'Contract too long',
};

/** Presses Enter in the input field. */
async function pressEnter(): Promise<void> {
  await act(async () => {
    inputField().dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Enter',
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
  });
}

/** Clicks the send button, found by its public test ID. */
async function clickSend(): Promise<void> {
  await act(async () => {
    getByTestId(PageObjectId.INPUT_SEND).click();
  });
}

/** Whether the send button reports itself disabled. */
const sendIsDisabled = () => isDisabled(getByTestId(PageObjectId.INPUT_SEND));

/** Tries both ways a user sends, then waits long enough to see no request. */
async function trySendBothWays(): Promise<void> {
  await clickSend();
  await pressEnter();
  // A short wait proves no send follows.
  await pause();
}

// @covers instance.input state.input.rawValue state.input.content
describe('sending from the input', () => {
  contractSetup();

  it('sends the typed text on a send-button click, from the message input', async () => {
    const { backend } = await openChat();
    await typeText('by click');
    expect(sendIsDisabled()).toBe(false);
    await clickSend();
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    const [sent] = backend.requests;
    expect(sent.request.input.text).toBe('by click');
    expect(sent.options.busEventSend?.source).toBe(
      MessageSendSource.MESSAGE_INPUT
    );
  });

  it('sends the typed text on Enter', async () => {
    const { backend } = await openChat();
    await typeText('by enter');
    await pressEnter();
    await waitFor(() => expect(backend.texts()).toEqual(['by enter']));
  });

  it('empties the draft after a send', async () => {
    const { instance, backend } = await openChat();
    await typeText('gone after');
    await clickSend();
    await waitFor(() => expect(backend.requests).toHaveLength(1));
    expect(instance.state.get().input.rawValue).toBe('');
    expect(instance.state.get().input.content).toEqual({
      type: 'doc',
      content: [{ type: 'paragraph' }],
    });
    expect(inputField().value).toBe('');
  });

  it('sends nothing for an empty or blank draft', async () => {
    const { backend } = await openChat();
    expect(sendIsDisabled()).toBe(true);
    await clickSend();
    await typeText('   ');
    expect(sendIsDisabled()).toBe(true);
    await trySendBothWays();
    expect(backend.requests).toHaveLength(0);
  });

  it('leaves the draft alone on instance.send', async () => {
    const { instance, backend } = await openChat();
    await typeText('still here');
    await act(async () => {
      await instance.send('from code');
    });
    expect(backend.texts()).toEqual(['from code']);
    expect(instance.state.get().input.rawValue).toBe('still here');
    expect(inputField().value).toBe('still here');
  });
});

// @covers config.input config.input.isDisabled
describe('input.isDisabled', () => {
  contractSetup();

  let consoleWarn: jest.SpyInstance;
  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleWarn?.mockRestore();
  });

  it('disables the field and the send button, and sends nothing', async () => {
    const { instance, backend } = await openChat({
      input: { isDisabled: true },
    });
    await act(async () => {
      await instance.input.updateContent(() => ({
        type: 'doc',
        content: [
          { type: 'paragraph', content: [{ type: 'text', text: 'x' }] },
        ],
      }));
    });
    expect(inputField().disabled).toBe(true);
    expect(sendIsDisabled()).toBe(true);
    await trySendBothWays();
    expect(backend.requests).toHaveLength(0);
  });

  it('still lets instance.send through', async () => {
    const { instance, backend } = await openChat({
      input: { isDisabled: true },
    });
    await act(async () => {
      await instance.send('from code');
    });
    expect(backend.texts()).toEqual(['from code']);
  });

  // @covers instance.updateInputIsDisabled
  it('is not lifted by updateInputIsDisabled(false)', async () => {
    const { instance } = await openChat({ input: { isDisabled: true } });
    await act(async () => {
      instance.updateInputIsDisabled(false);
    });
    expect(inputField().disabled).toBe(true);
  });
});

// @covers instance.updateInputIsDisabled
describe('updateInputIsDisabled', () => {
  contractSetup();

  let consoleWarn: jest.SpyInstance;
  beforeEach(() => {
    consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  });
  afterEach(() => {
    consoleWarn?.mockRestore();
  });

  it('disables the field and the send button, then enables them again', async () => {
    const { instance, backend } = await openChat();
    await typeText('draft');
    await act(async () => {
      instance.updateInputIsDisabled(true);
    });
    expect(inputField().disabled).toBe(true);
    expect(sendIsDisabled()).toBe(true);
    await clickSend();
    // A short wait proves no send follows.
    await pause();
    expect(backend.requests).toHaveLength(0);

    await act(async () => {
      instance.updateInputIsDisabled(false);
    });
    expect(inputField().disabled).toBe(false);
    expect(sendIsDisabled()).toBe(false);
  });

  // @covers config.isReadonly
  it('overrides isReadonly', async () => {
    const { instance } = await openChat({ isReadonly: true });
    expect(inputField().disabled).toBe(true);
    await act(async () => {
      instance.updateInputIsDisabled(false);
    });
    expect(inputField().disabled).toBe(false);
  });

  it('warns that it is deprecated on each call', async () => {
    const { instance } = await openChat();
    consoleWarn.mockClear();
    const deprecations = () =>
      consoleWarn.mock.calls.filter((args) =>
        args.some((arg: unknown) =>
          String(arg).includes('updateInputIsDisabled')
        )
      );
    await act(async () => {
      instance.updateInputIsDisabled(true);
      instance.updateInputIsDisabled(false);
    });
    expect(deprecations()).toHaveLength(2);
  });
});

// @covers config.input config.input.isSendDisabled
describe('input.isSendDisabled', () => {
  contractSetup();

  it('keeps the field editable but sends nothing from it', async () => {
    const { instance, backend } = await openChat({
      input: { isSendDisabled: true },
    });
    await typeText('held');
    expect(inputField().disabled).toBe(false);
    expect(sendIsDisabled()).toBe(true);
    await trySendBothWays();
    expect(backend.requests).toHaveLength(0);
    expect(instance.state.get().input.rawValue).toBe('held');
  });

  it('still lets instance.send through', async () => {
    const { instance, backend } = await openChat({
      input: { isSendDisabled: true },
    });
    await act(async () => {
      await instance.send('from code');
    });
    expect(backend.texts()).toEqual(['from code']);
  });
});

// @covers config.input config.input.maxInputCharacters
describe('input.maxInputCharacters', () => {
  contractSetup();

  it('sends a draft at the limit', async () => {
    const { backend } = await openChat({
      strings: STRINGS,
      input: { maxInputCharacters: 5 },
    });
    await typeText('12345');
    expect(shownText(document.body)).not.toContain(
      STRINGS.input_maxCharCountExceededTitle
    );
    await clickSend();
    await waitFor(() => expect(backend.texts()).toEqual(['12345']));
  });

  it('shows the over-limit error and blocks sending past the limit, keeping every character', async () => {
    const { instance, backend } = await openChat({
      strings: STRINGS,
      input: { maxInputCharacters: 5 },
    });
    await typeText('123456');
    expect(shownText(document.body)).toContain(
      STRINGS.input_maxCharCountExceededTitle
    );
    expect(sendIsDisabled()).toBe(true);
    await trySendBothWays();
    expect(backend.requests).toHaveLength(0);
    expect(instance.state.get().input.rawValue).toBe('123456');
  });

  it('does not limit instance.send', async () => {
    const { instance, backend } = await openChat({
      strings: STRINGS,
      input: { maxInputCharacters: 5 },
    });
    await act(async () => {
      await instance.send('123456789');
    });
    expect(backend.texts()).toEqual(['123456789']);
  });

  it('defaults to 10000', async () => {
    await openChat({ strings: STRINGS });
    await typeText('a'.repeat(10000));
    expect(sendIsDisabled()).toBe(false);
    await typeText('a'.repeat(10001));
    expect(sendIsDisabled()).toBe(true);
    expect(shownText(document.body)).toContain(
      STRINGS.input_maxCharCountExceededTitle
    );
  });
});

// @covers config.input config.input.error
describe('input.error', () => {
  contractSetup();

  it('shows the error title and description', async () => {
    await openChat({
      input: {
        error: {
          title: 'Contract error title',
          description: 'Contract error description',
        },
      },
    });
    const text = shownText(document.body);
    expect(text).toContain('Contract error title');
    expect(text).toContain('Contract error description');
  });
});

// @covers config.input config.input.actions
describe('input.actions', () => {
  contractSetup();

  function actionsConfig(onClick: jest.Mock): Partial<PublicConfig> {
    return {
      strings: STRINGS,
      input: {
        actions: [
          {
            text: 'Contract action',
            icon: Add16,
            testId: 'contract-action',
            onClick: () => onClick('enabled'),
          },
          {
            text: 'Contract disabled action',
            icon: Add16,
            disabled: true,
            onClick: () => onClick('disabled'),
          },
        ],
      },
    };
  }

  it('lists the actions in a menu behind the actions button', async () => {
    await openChat(actionsConfig(jest.fn()));
    expect(allByRole('menuitem', 'Contract action')).toHaveLength(0);
    await click(byRole('button', STRINGS.input_actionsMenuLabel));
    const item = await waitFor(() => byRole('menuitem', 'Contract action'));
    expect(item).toBe(byTestId('contract-action'));
    expect(
      byRole('menuitem', 'Contract disabled action').getAttribute(
        'aria-disabled'
      )
    ).toBe('true');
  });

  it('calls an action onClick and closes the menu', async () => {
    const onClick = jest.fn();
    await openChat(actionsConfig(onClick));
    await click(byRole('button', STRINGS.input_actionsMenuLabel));
    await click(await waitFor(() => byRole('menuitem', 'Contract action')));
    expect(onClick.mock.calls).toEqual([['enabled']]);
    await waitFor(() =>
      expect(allByRole('menuitem', 'Contract action')).toHaveLength(0)
    );
  });

  /** One disabled action, which records each run of its onClick. */
  function disabledActionConfig(onClick: jest.Mock): Partial<PublicConfig> {
    return {
      strings: STRINGS,
      input: {
        actions: [
          {
            text: 'Contract disabled action',
            icon: Add16,
            disabled: true,
            onClick,
          },
        ],
      },
    };
  }

  it('does not run a disabled action by click or by Enter', async () => {
    const onClick = jest.fn();
    await openChat(disabledActionConfig(onClick));
    await click(byRole('button', STRINGS.input_actionsMenuLabel));
    const item = await waitFor(() =>
      byRole('menuitem', 'Contract disabled action')
    );
    await click(item);
    await act(async () => {
      item.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: 'Enter',
          bubbles: true,
          composed: true,
          cancelable: true,
        })
      );
    });
    expect(onClick).not.toHaveBeenCalled();
  });

  it('shows no actions button without actions', async () => {
    await openChat({ strings: STRINGS });
    expect(allByRole('button', STRINGS.input_actionsMenuLabel)).toHaveLength(0);
  });

  it('lists an action without an icon by its text, and runs it', async () => {
    const onClick = jest.fn();
    await openChat({
      strings: STRINGS,
      input: { actions: [{ text: 'Contract text action', onClick }] },
    });
    await click(byRole('button', STRINGS.input_actionsMenuLabel));
    await click(
      await waitFor(() => byRole('menuitem', 'Contract text action'))
    );
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  // @covers config.input.expanded
  it('shows an action without an icon as a button named by its text in the expanded layout', async () => {
    const onClick = jest.fn();
    await openChat({
      input: {
        expanded: true,
        actions: [{ text: 'Contract text action', onClick }],
      },
    });
    await click(byRole('button', 'Contract text action'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  const OVERFLOW_ACTION_TEXT = 'Contract overflow action';
  const OVERFLOW_LABEL = 'Contract more input actions';

  async function withExpandedOverflowAction(
    onClick: jest.Mock,
    disabled: boolean,
    check: (item: HTMLElement) => Promise<void>
  ): Promise<void> {
    // jsdom has no layout; give named actions widths within a narrow row.
    const originalBounds = HTMLElement.prototype.getBoundingClientRect;
    const bounds = jest
      .spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockImplementation(function (this: HTMLElement) {
        return this.getAttribute('data-testid')?.startsWith(
          'contract-overflow-'
        )
          ? new DOMRect(0, 0, 48, 32)
          : originalBounds.call(this);
      });
    const width = jest
      .spyOn(HTMLElement.prototype, 'clientWidth', 'get')
      .mockReturnValue(240);
    try {
      await openChat({
        strings: { input_actionsOverflowLabel: OVERFLOW_LABEL },
        input: {
          expanded: true,
          actions: [
            ...Array.from({ length: 7 }, (_, index) => ({
              text: `Contract earlier action ${index}`,
              icon: Add16,
              testId: `contract-overflow-${index}`,
            })),
            {
              text: OVERFLOW_ACTION_TEXT,
              testId: 'contract-overflow-target',
              icon: disabled ? Add16 : undefined,
              disabled,
              onClick,
            },
          ],
        },
      });
      await act(async () => {
        for (let frame = 0; frame < 3; frame += 1) {
          await new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve())
          );
        }
      });
      expect(inputField()).not.toBeNull();
      expect(allByRole('menuitem', OVERFLOW_ACTION_TEXT)).toHaveLength(0);
      await click(byRole('button', OVERFLOW_LABEL));
      const item = await waitFor(() =>
        byRole('menuitem', OVERFLOW_ACTION_TEXT)
      );
      await check(item);
    } finally {
      bounds.mockRestore();
      width.mockRestore();
    }
  }

  // @covers config.input.expanded
  it('shows a readable action without an icon in expanded overflow, and runs it on selection', async () => {
    const onClick = jest.fn();
    await withExpandedOverflowAction(onClick, false, async (item) => {
      expect(shownText(item)).toContain(OVERFLOW_ACTION_TEXT);
      expect(isDisabled(item)).toBe(false);
      await click(item);
      expect(onClick).toHaveBeenCalledTimes(1);
      await waitFor(() =>
        expect(allByRole('menuitem', OVERFLOW_ACTION_TEXT)).toHaveLength(0)
      );
    });
  });

  // @covers config.input.expanded
  it('does not run a disabled expanded overflow action on a mouse click', async () => {
    const onClick = jest.fn();
    await withExpandedOverflowAction(onClick, true, async (item) => {
      expect(item.getAttribute('aria-disabled')).toBe('true');
      await click(item);
      expect(onClick).not.toHaveBeenCalled();
      expect(byRole('menuitem', OVERFLOW_ACTION_TEXT)).toBe(item);
    });
  });
});
