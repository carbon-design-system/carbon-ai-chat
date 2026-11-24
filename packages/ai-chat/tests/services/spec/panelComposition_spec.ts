/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  isCustomPanelConfigOptions,
  deriveCustomPanelComposition,
  deriveResponsePanelComposition,
  deriveEndChatPrompt,
  deriveScreenSharePrompt,
  createPanelTransitionCallbacks,
  createCustomPanelActions,
  createEndChatActions,
  createScreenShareActions,
  focusPanelBodyBeforeHeader,
  handleConfirmationOpen,
  handleConfirmationKey,
  type PanelViewInputs,
  type PanelCompositionCallbacks,
} from '../../../src/chat/utils/panelComposition';
import { BusEventType } from '../../../src/types/events/eventBusTypes';
import { ScreenShareState } from '../../../src/types/config/ServiceDeskConfig';
import * as domUtils from '../../../src/chat/utils/domUtils';

function callbacks() {
  const order: unknown[] = [];
  const api: PanelCompositionCallbacks = {
    onPanelOpenStart: jest.fn((isPanel) => {
      order.push(['open:start', isPanel]);
    }),
    onPanelOpenEnd: jest.fn((event) => {
      order.push(['open:end', event]);
    }),
    onPanelCloseStart: jest.fn((event) => {
      order.push(['close:start', event]);
    }),
    onPanelCloseEnd: jest.fn((isPanel) => {
      order.push(['close:end', isPanel]);
    }),
    onClose: jest.fn(() => {
      order.push('window:close');
    }),
    onRestart: jest.fn(() => {
      order.push('restart');
    }),
    onToggleHomeScreen: jest.fn(),
    onAcceptDisclaimer: jest.fn(),
    confirmHumanAgentEndChat: jest.fn(),
    hideConfirmEndChat: jest.fn(),
    fireCustomPanelEvent: jest.fn((type) => {
      order.push(type);
    }),
    resetCustomPanelOptions: jest.fn(() => {
      order.push('custom:reset');
    }),
    closeCustomPanel: jest.fn(() => {
      order.push('custom:back');
    }),
    closeResponsePanel: jest.fn(),
    clearResponsePanelContent: jest.fn(() => {
      order.push('response:clear');
    }),
    closeIFramePanel: jest.fn(),
    closeViewSourcePanel: jest.fn(),
    closeHistoryPanel: jest.fn(() => {
      order.push('history:close');
    }),
    updateScreenShareRequest: jest.fn(),
    announce: jest.fn(),
  };
  return { api, order };
}

afterEach(() => jest.restoreAllMocks());

describe('custom panel composition', () => {
  it.each([
    { disableDefaultCloseAction: false },
    { hideCloseButton: false },
    { onClickBack: () => {} },
    { onClickRestart: () => {} },
    { onClickClose: () => {} },
  ])(
    'recognizes legacy options through their exact marker types: %o',
    (options) => {
      expect(isCustomPanelConfigOptions(options)).toBe(true);
    }
  );

  it('does not mistake shared display options or null markers for legacy controls', () => {
    expect(
      isCustomPanelConfigOptions({ title: 'Title', hideBackButton: true })
    ).toBe(false);
    expect(isCustomPanelConfigOptions({ hidePanelHeader: true })).toBe(false);
    expect(
      isCustomPanelConfigOptions({ hideCloseButton: null, onClickClose: null })
    ).toBe(false);
  });

  it('retains current default frame, header, and animation choices without mutating options', () => {
    const options = Object.freeze({ title: 'A **title**' });
    expect(deriveCustomPanelComposition(options)).toEqual({
      isLegacy: false,
      title: 'A **title**',
      showPanelHeader: true,
      showBackButton: true,
      headerConfigOverride: undefined,
      fullWidth: false,
      showFrame: false,
      aiEnabled: false,
      showChatHeader: false,
      openFromSide: false,
      animationOnOpen: 'slide-in-from-bottom',
      animationOnClose: 'slide-out-to-bottom',
      backButtonType: undefined,
      backButtonPosition: undefined,
    });
    expect(options).toEqual({ title: 'A **title**' });
  });

  it('retains modern side-panel options and disabled animation precedence', () => {
    const options = {
      fullWidth: true,
      showFrame: true,
      aiEnabled: true,
      showChatHeader: true,
      openFromSide: true,
      backButtonType: 'close' as const,
      backButtonPosition: 'start' as const,
    };
    expect(deriveCustomPanelComposition(options)).toMatchObject({
      fullWidth: true,
      showFrame: true,
      aiEnabled: true,
      showChatHeader: true,
      openFromSide: true,
      animationOnOpen: 'slide-in-from-start',
      animationOnClose: 'slide-out-to-start',
      backButtonType: 'close',
      backButtonPosition: 'start',
    });
    expect(
      deriveCustomPanelComposition({ ...options, disableAnimation: true })
    ).toMatchObject({
      animationOnOpen: 'none',
      animationOnClose: 'none',
      openFromSide: true,
    });
  });

  it('keeps legacy header overrides conditional and suppresses the modern chat-header flag', () => {
    expect(
      deriveCustomPanelComposition({
        hideCloseButton: false,
        title: 'Breadcrumb',
      })
    ).toMatchObject({
      isLegacy: true,
      headerConfigOverride: { hideMinimizeButton: false, title: undefined },
    });
    expect(
      deriveCustomPanelComposition({
        hideCloseButton: true,
        hideBackButton: true,
        title: '**Primary**',
        showChatHeader: true,
      })
    ).toMatchObject({
      isLegacy: true,
      showBackButton: false,
      showChatHeader: false,
      headerConfigOverride: { hideMinimizeButton: true, title: '**Primary**' },
    });
    expect(
      deriveCustomPanelComposition({
        hidePanelHeader: true,
        hideBackButton: false,
      }).showPanelHeader
    ).toBe(false);
  });

  it('runs close, restart and back actions in the original synchronous order', () => {
    const { api, order } = callbacks();
    const options = {
      onClickClose: () => order.push('host:close'),
      onClickRestart: () => order.push('host:restart'),
      onClickBack: () => order.push('host:back'),
    };
    const controls = createCustomPanelActions(options, api);
    controls.onClose();
    controls.onRestart();
    controls.onClickBack();
    expect(order).toEqual([
      'window:close',
      'host:close',
      'restart',
      'host:restart',
      'custom:back',
      'host:back',
    ]);
    order.length = 0;
    createCustomPanelActions(
      { ...options, disableDefaultCloseAction: true },
      api
    ).onClose();
    expect(order).toEqual(['host:close']);
  });
});

describe('response panel defaults', () => {
  function response(
    panel: Record<string, unknown>
  ): PanelViewInputs['responsePanelState'] {
    return {
      localMessageItem: { item: { panel } },
    } as unknown as PanelViewInputs['responsePanelState'];
  }

  it.each([undefined, false, null, true])(
    'preserves explicit %s values rather than using nullish defaults',
    (value) => {
      expect(
        deriveResponsePanelComposition(
          response({
            title: 'Title',
            full_width: value,
            show_frame: value,
            ai_enabled: value,
            show_header: value,
          }),
          false
        )
      ).toEqual({
        title: 'Title',
        fullWidth: Boolean(value),
        showFrame: value === undefined ? true : value,
        aiEnabled: value === undefined ? false : value,
        showChatHeader: value === undefined ? true : value,
        showPanelHeader: value !== false,
      });
    }
  );

  it('inherits only omitted AI mode and keeps empty-response defaults', () => {
    expect(deriveResponsePanelComposition(response({}), true).aiEnabled).toBe(
      true
    );
    const empty = {
      localMessageItem: null,
    } as PanelViewInputs['responsePanelState'];
    expect(deriveResponsePanelComposition(empty, true)).toEqual({
      title: undefined,
      fullWidth: false,
      showFrame: true,
      aiEnabled: true,
      showChatHeader: true,
      showPanelHeader: true,
    });
  });
});

describe('panel transition ordering', () => {
  it('delivers custom events before shell effects and resets defaults before close-end', () => {
    const { api, order } = callbacks();
    const pending = new Promise<void>(() => {});
    api.fireCustomPanelEvent = jest.fn((type) => {
      order.push(type);
      return pending;
    });
    const transitions = createPanelTransitionCallbacks('custom', api);
    const open = new CustomEvent('open', { detail: { isReactivation: true } });
    const close = new CustomEvent('close');
    transitions.onOpenStart();
    transitions.onOpenEnd(open);
    transitions.onCloseStart(close);
    transitions.onCloseEnd();
    expect(order).toEqual([
      BusEventType.CUSTOM_PANEL_PRE_OPEN,
      ['open:start', true],
      BusEventType.CUSTOM_PANEL_OPEN,
      ['open:end', open],
      BusEventType.CUSTOM_PANEL_PRE_CLOSE,
      ['close:start', close],
      BusEventType.CUSTOM_PANEL_CLOSE,
      'custom:reset',
      ['close:end', true],
    ]);
  });

  it.each(['hydration', 'disclaimer'] as const)(
    'retains non-panel callback flags for %s',
    (name) => {
      const { api, order } = callbacks();
      const transitions = createPanelTransitionCallbacks(name, api);
      transitions.onOpenStart();
      transitions.onCloseEnd();
      expect(order).toEqual([
        ['open:start', false],
        ['close:end', false],
      ]);
    }
  );

  it.each(['response', 'history'] as const)(
    'runs %s cleanup after the shell close callback',
    (name) => {
      const { api, order } = callbacks();
      createPanelTransitionCallbacks(name, api).onCloseEnd();
      expect(order).toEqual([
        ['close:end', true],
        name === 'response' ? 'response:clear' : 'history:close',
      ]);
    }
  );
});

describe('prompt derivation and actions', () => {
  const labels = {
    agent_endChat: 'End chat',
    agent_confirmCancelRequestTitle: 'Cancel request',
    agent_confirmEndChat: 'End this chat?',
    agent_confirmCancelRequestMessage: 'Cancel waiting?',
    agent_confirmEndChatNo: 'No',
    agent_confirmEndSuspendedYes: 'End suspended',
    agent_confirmEndChatYes: 'End',
    agent_confirmCancelRequestYes: 'Cancel',
  };

  it.each([
    {
      connected: false,
      suspended: false,
      title: 'Cancel request',
      message: 'Cancel waiting?',
      confirm: 'Cancel',
    },
    {
      connected: true,
      suspended: false,
      title: 'End chat',
      message: 'End this chat?',
      confirm: 'End',
    },
    {
      connected: true,
      suspended: true,
      title: 'End chat',
      message: 'End this chat?',
      confirm: 'End suspended',
    },
  ])(
    'keeps end-chat labels for $connected/$suspended',
    ({ connected, suspended, title, message, confirm }) => {
      expect(deriveEndChatPrompt(null, connected, suspended, labels)).toEqual({
        title,
        message,
        cancelButtonLabel: 'No',
        confirmButtonLabel: confirm,
        announceMessage: message,
      });
      expect(
        deriveEndChatPrompt(
          { title: '', message: '' },
          connected,
          suspended,
          labels
        ).message
      ).toBe(message);
      expect(
        deriveEndChatPrompt(
          { title: 'Card title', message: 'Card message' },
          connected,
          suspended,
          labels
        )
      ).toMatchObject({
        title: 'Card title',
        message: 'Card message',
        announceMessage: 'Card message',
      });
    }
  );

  it('keeps card-owned confirmation callbacks and current screen-share facade calls', () => {
    const { api } = callbacks();
    const card = { onConfirm: jest.fn(), onCancel: jest.fn() };
    const end = createEndChatActions(card, api);
    end.onConfirm();
    end.onCancel();
    expect(card.onConfirm).toHaveBeenCalledTimes(1);
    expect(card.onCancel).toHaveBeenCalledTimes(1);
    expect(api.confirmHumanAgentEndChat).not.toHaveBeenCalled();
    const defaults = createEndChatActions(null, api);
    expect(defaults.onConfirm).toBe(api.confirmHumanAgentEndChat);
    expect(defaults.onCancel).toBe(api.hideConfirmEndChat);
    const share = createScreenShareActions(api);
    share.onConfirm();
    share.onCancel();
    expect((api.updateScreenShareRequest as jest.Mock).mock.calls).toEqual([
      [ScreenShareState.ACCEPTED],
      [ScreenShareState.DECLINED],
    ]);
    expect(
      deriveScreenSharePrompt({
        agent_sharingRequestTitle: 'Share?',
        agent_sharingRequestMessage: 'Message',
        agent_sharingDeclineButton: 'Decline',
        agent_sharingAcceptButton: 'Accept',
      })
    ).toEqual({
      title: 'Share?',
      message: 'Message',
      cancelButtonLabel: 'Decline',
      confirmButtonLabel: 'Accept',
      announceMessage: 'Message',
    });
  });

  it('focuses before prompt speech, skips reactivation and cancels Escape after stopping the event', () => {
    const order: string[] = [];
    const footer = document.createElement('div');
    const focus = jest
      .spyOn(domUtils, 'focusOnFirstFocusableElement')
      .mockImplementation(() => {
        order.push('focus');
        return false;
      });
    const announce = jest.fn(() => {
      order.push('announce');
    });
    handleConfirmationOpen(new CustomEvent('open'), footer, 'Prompt', announce);
    expect(order).toEqual(['focus', 'announce']);
    expect(announce).toHaveBeenCalledWith('Prompt');
    handleConfirmationOpen(
      new CustomEvent('open', { detail: { isReactivation: true } }),
      footer,
      'Prompt',
      announce
    );
    expect(focus).toHaveBeenCalledTimes(1);
    expect(announce).toHaveBeenCalledTimes(1);
    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    jest.spyOn(escape, 'preventDefault').mockImplementation(() => {
      order.push('prevent');
    });
    jest.spyOn(escape, 'stopPropagation').mockImplementation(() => {
      order.push('stop');
    });
    handleConfirmationKey(escape, () => {
      order.push('cancel');
    });
    expect(order).toEqual(['focus', 'announce', 'prevent', 'stop', 'cancel']);
    handleConfirmationKey(
      new KeyboardEvent('keydown', { key: 'Enter' }),
      () => {
        order.push('unexpected');
      }
    );
    expect(order).not.toContain('unexpected');
  });
});

describe('body-before-header panel focus', () => {
  it('stops after a body target succeeds and falls back to the header otherwise', () => {
    const body = document.createElement('div');
    const header = document.createElement('div');
    const focus = jest
      .spyOn(domUtils, 'focusOnFirstFocusableElement')
      .mockReturnValueOnce(true);
    expect(focusPanelBodyBeforeHeader(body, header)).toBe(true);
    expect(focus.mock.calls).toEqual([[body]]);
    focus.mockClear();
    focus.mockReturnValueOnce(false).mockReturnValueOnce(true);
    expect(focusPanelBodyBeforeHeader(body, header)).toBe(true);
    expect(focus.mock.calls).toEqual([[body], [header]]);
    focus.mockClear();
    focus.mockReturnValue(false);
    expect(focusPanelBodyBeforeHeader(undefined, header)).toBe(false);
    expect(focus.mock.calls).toEqual([[header]]);
    expect(focusPanelBodyBeforeHeader()).toBe(false);
  });
});
