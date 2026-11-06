/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import {
  act,
  fireEvent,
  render as renderReact,
  screen,
} from '@testing-library/react';
import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import { EndHumanAgentChatPanel } from '../../../src/chat/components/panels/EndHumanAgentChatPanel';
import { RequestScreenSharePanel } from '../../../src/chat/components/panels/RequestScreenSharePanel';
import { ScreenShareState } from '../../../src/types/config/ServiceDeskConfig';
import languagePack from '../../../src/chat/languages/en.json';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createTestViewState } from '../../test_helpers';

class PromptProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });

  render() {
    return nothing;
  }
}
customElements.define('test-native-prompt-provider', PromptProvider);

let promptHost: PromptProvider;
let promptRoot: HTMLDivElement;

function render(children: React.ReactElement) {
  return renderReact(children, { container: promptRoot });
}

const mockAnnounce = jest.fn();
const mockFocus = jest.fn();
const mockUpdateSharing = jest.fn();
let mockOnOpenEnd: (event: CustomEvent) => void;
let mockState: {
  languagePack: typeof languagePack;
  persistedToBrowserStorage: {
    humanAgentState: { isConnected: boolean; isSuspended: boolean };
  };
};

jest.mock('../../../src/chat/hooks/useSelector', () => ({
  useSelector: (selector: (state: typeof mockState) => unknown) =>
    selector(mockState),
}));

jest.mock('../../../src/chat/hooks/useAriaAnnouncer', () => ({
  useAriaAnnouncer: () => mockAnnounce,
}));

jest.mock('../../../src/chat/hooks/useServiceManager', () => ({
  useServiceManager: () => ({
    humanAgentService: { screenShareUpdateRequestState: mockUpdateSharing },
  }),
}));

jest.mock('../../../src/chat/utils/domUtils', () => ({
  focusOnFirstFocusableElement: (element: HTMLElement) => mockFocus(element),
}));

jest.mock('@carbon/ai-chat-components/es/react/panel.js', () => ({
  __esModule: true,
  default: ({
    children,
    onKeyDown,
    onOpenEnd,
  }: {
    children: React.ReactNode;
    onKeyDown: React.KeyboardEventHandler;
    onOpenEnd: (event: CustomEvent) => void;
  }) => {
    mockOnOpenEnd = onOpenEnd;
    return (
      <div role="presentation" onKeyDown={onKeyDown}>
        {children}
      </div>
    );
  },
}));

jest.mock('../../../src/chat/components/panels/PanelHeader', () => ({
  PanelHeader: ({
    labelBackButton,
    onClickBack,
  }: {
    labelBackButton: string;
    onClickBack: () => void;
  }) => (
    <button
      type="button"
      aria-label={`Close: ${labelBackButton}`}
      onClick={onClickBack}
    />
  ),
}));

jest.mock('../../../src/chat/components/carbon/Button', () => ({
  __esModule: true,
  BUTTON_KIND: { SECONDARY: 'secondary' },
  default: ({
    children,
    onClick,
  }: {
    children: React.ReactNode;
    onClick: () => void;
  }) => (
    <button type="button" onClick={onClick}>
      {children}
    </button>
  ),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockState = {
    languagePack,
    persistedToBrowserStorage: {
      humanAgentState: { isConnected: true, isSuspended: false },
    },
  };
  promptHost = document.createElement(
    'test-native-prompt-provider'
  ) as PromptProvider;
  promptHost.provider.setValue(createTestViewState());
  promptRoot = document.createElement('div');
  promptHost.appendChild(promptRoot);
  document.body.appendChild(promptHost);
});

afterEach(() => promptHost.remove());

describe('end human agent chat panel', () => {
  it.each([
    [
      true,
      false,
      'agent_endChat',
      'agent_confirmEndChat',
      'agent_confirmEndChatYes',
    ],
    [
      true,
      true,
      'agent_endChat',
      'agent_confirmEndChat',
      'agent_confirmEndSuspendedYes',
    ],
    [
      false,
      false,
      'agent_confirmCancelRequestTitle',
      'agent_confirmCancelRequestMessage',
      'agent_confirmCancelRequestYes',
    ],
  ] as const)(
    'uses the connected=%s and suspended=%s language variant',
    async (isConnected, isSuspended, title, message, confirmLabel) => {
      mockState.persistedToBrowserStorage.humanAgentState = {
        isConnected,
        isSuspended,
      };
      const onConfirm = jest.fn();
      const onCancel = jest.fn();
      render(
        <EndHumanAgentChatPanel
          open
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      );

      expect(
        await screen.findByRole('heading', { name: languagePack[title] })
      ).toBeTruthy();
      expect(screen.getByText(languagePack[message])).toBeTruthy();
      fireEvent.click(
        screen.getByRole('button', { name: languagePack[confirmLabel] })
      );
      expect(onConfirm).toHaveBeenCalledTimes(1);
      fireEvent.click(
        screen.getByRole('button', {
          name: languagePack.agent_confirmEndChatNo,
        })
      );
      expect(onCancel).toHaveBeenCalledTimes(1);
    }
  );

  it('uses host title and message overrides', async () => {
    render(
      <EndHumanAgentChatPanel
        open
        title="Finish support"
        message="Leave this conversation?"
        onConfirm={jest.fn()}
        onCancel={jest.fn()}
      />
    );

    expect(
      await screen.findByRole('heading', { name: 'Finish support' })
    ).toBeTruthy();
    expect(screen.getByText('Leave this conversation?')).toBeTruthy();
    act(() =>
      mockOnOpenEnd(
        new CustomEvent('openend', { detail: { isReactivation: false } })
      )
    );
    expect(mockAnnounce).toHaveBeenCalledWith('Leave this conversation?');
  });

  it('updates native prompt text without interpreting host text as markup', async () => {
    const props = { open: true, onConfirm: jest.fn(), onCancel: jest.fn() };
    const { rerender } = render(
      <EndHumanAgentChatPanel
        {...props}
        title="<strong>Finish support</strong>"
        message="<img src=x onerror=alert(1)>"
      />
    );
    const heading = await screen.findByRole('heading', {
      name: '<strong>Finish support</strong>',
    });
    const body = heading.closest('cds-aichat-confirmation-body');
    expect(body.shadowRoot).toBeNull();
    expect(body.getAttribute('slot')).toBe('body');
    expect(body.querySelector('strong, img')).toBeNull();
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeTruthy();

    rerender(
      <EndHumanAgentChatPanel
        {...props}
        title="Leave support"
        message="You can start another conversation."
      />
    );
    expect(await screen.findByRole('heading', { name: 'Leave support' })).toBe(
      heading
    );
    expect(
      screen.getByText('You can start another conversation.')
    ).toBeTruthy();
  });
});

describe('screen share request panel', () => {
  it.each([
    ['agent_sharingAcceptButton', ScreenShareState.ACCEPTED],
    ['agent_sharingDeclineButton', ScreenShareState.DECLINED],
  ] as const)('maps %s to %s', (label, state) => {
    render(<RequestScreenSharePanel open />);

    fireEvent.click(screen.getByRole('button', { name: languagePack[label] }));

    expect(mockUpdateSharing).toHaveBeenCalledTimes(1);
    expect(mockUpdateSharing).toHaveBeenCalledWith(state);
  });

  it('declines from the header close button', () => {
    render(<RequestScreenSharePanel open />);

    fireEvent.click(
      screen.getByRole('button', {
        name: `Close: ${languagePack.agent_sharingDeclineButton}`,
      })
    );

    expect(mockUpdateSharing).toHaveBeenCalledTimes(1);
    expect(mockUpdateSharing).toHaveBeenCalledWith(ScreenShareState.DECLINED);
  });

  it('declines on Escape and stops Escape from reaching the chat shell', () => {
    const onKeyDown = jest.fn();
    render(
      <div role="presentation" onKeyDown={onKeyDown}>
        <RequestScreenSharePanel open />
      </div>
    );

    fireEvent.keyDown(
      screen.getByRole('button', {
        name: languagePack.agent_sharingDeclineButton,
      }),
      { key: 'Escape' }
    );

    expect(mockUpdateSharing).toHaveBeenCalledWith(ScreenShareState.DECLINED);
    expect(onKeyDown).not.toHaveBeenCalled();
  });

  it('preserves focus on reactivation and resets after a close and reopen', () => {
    const { rerender } = render(<RequestScreenSharePanel open />);
    act(() =>
      mockOnOpenEnd(
        new CustomEvent('openend', { detail: { isReactivation: false } })
      )
    );
    rerender(<RequestScreenSharePanel open />);
    act(() =>
      mockOnOpenEnd(
        new CustomEvent('openend', { detail: { isReactivation: true } })
      )
    );

    expect(mockFocus).toHaveBeenCalledTimes(1);
    expect(mockAnnounce).toHaveBeenCalledTimes(1);

    rerender(<RequestScreenSharePanel open={false} />);
    rerender(<RequestScreenSharePanel open />);
    act(() =>
      mockOnOpenEnd(
        new CustomEvent('openend', { detail: { isReactivation: false } })
      )
    );

    expect(mockFocus).toHaveBeenCalledTimes(2);
    expect(mockAnnounce).toHaveBeenCalledTimes(2);
  });

  it('requests footer focus and announces only after the panel opens', () => {
    render(<RequestScreenSharePanel open />);
    expect(mockFocus).not.toHaveBeenCalled();
    expect(mockAnnounce).not.toHaveBeenCalled();

    act(() =>
      mockOnOpenEnd(
        new CustomEvent('openend', { detail: { isReactivation: false } })
      )
    );

    const decline = screen.getByRole('button', {
      name: languagePack.agent_sharingDeclineButton,
    });
    expect(mockFocus).toHaveBeenCalledWith(decline.parentElement);
    expect(mockAnnounce).toHaveBeenCalledWith(
      languagePack.agent_sharingRequestMessage
    );
  });
});
