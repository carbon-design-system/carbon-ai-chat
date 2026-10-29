/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextProvider } from '@lit/context';
import { LitElement, nothing } from 'lit';
import '../../../src/chat/components/input/native/InputActions';
import type InputActions from '../../../src/chat/components/input/native/InputActions';
import {
  connectInputActionsMenu,
  connectInputActionsOverflow,
} from '../../../src/chat/utils/inputActionsLayout';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import type { ToolbarAction } from '../../../src/types/config/HeaderConfig';
import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

jest.mock('../../../src/chat/utils/inputActionsLayout', () => ({
  connectInputActionsMenu: jest.fn(() => jest.fn()),
  connectInputActionsOverflow: jest.fn(() => jest.fn()),
}));

class ActionsProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-native-input-actions-provider', ActionsProvider);
const states = new Set<ChatViewState>();
const icon = {
  elem: 'svg',
  name: 'test-action',
  size: 16,
  attrs: { viewBox: '0 0 16 16', width: 16, height: 16 },
  content: [{ elem: 'path', attrs: { d: 'M1 1h14v14H1z' } }],
};

async function fixture(actions: ToolbarAction[], expanded = false) {
  const store = makeConfigStore({});
  const errorOccurred = jest.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 600 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-input-actions-provider'
  ) as ActionsProvider;
  provider.provider.setValue(state);
  document.body.appendChild(provider);
  await provider.updateComplete;
  const view = document.createElement('cds-aichat-input-actions');
  view.actions = actions;
  view.expanded = expanded;
  view.menuLabel = 'Actions';
  view.transformIcon = jest.fn(() => icon);
  provider.shadowRoot.appendChild(view);
  await view.updateComplete;
  return { view, provider, errorOccurred };
}
function action(
  text: string,
  extra: Partial<ToolbarAction> = {}
): ToolbarAction {
  return { text, icon, id: text, testId: text, ...extra };
}
async function click(view: InputActions, selector: string) {
  const element = view.querySelector<HTMLElement>(selector);
  expect(element).not.toBeNull();
  element.click();
  await view.updateComplete;
}

beforeEach(() => {
  setupBeforeEach();
});
afterEach(() => {
  document.body.innerHTML = '';
  states.forEach((state) => state.disconnect());
  states.clear();
  setupAfterEach();
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

it('keeps compact labels, icons, disabled rules and action callback behavior', async () => {
  const selected = jest.fn();
  const { view } = await fixture([
    action('Select', { onClick: selected }),
    action('Disabled', { disabled: true }),
  ]);
  expect(view.style.display).toBe('contents');
  const trigger = view.querySelector<HTMLElement>(
    '[data-input-actions-trigger]'
  );
  expect(trigger.querySelector('[slot="tooltip-content"]').textContent).toBe(
    'Actions'
  );
  expect(trigger.hasAttribute('data-offset')).toBe(false);
  await click(view, '[data-input-actions-trigger]');
  const menu = view.querySelector('cds-menu') as HTMLElement & {
    label: string;
  };
  expect(menu.label).toBe('Actions');
  expect(
    view.querySelector('[data-testid="Disabled"]').hasAttribute('disabled')
  ).toBe(true);
  expect(view.transformIcon).toHaveBeenCalledWith(icon, 16);
  await click(view, '[data-testid="Select"]');
  expect(selected).toHaveBeenCalledTimes(1);
  expect(view.querySelector('cds-menu')).toBe(null);
  view.disabled = true;
  await view.updateComplete;
  expect(trigger.hasAttribute('disabled')).toBe(true);
});

it.each([undefined, '_blank'])(
  'keeps compact link target %s and skips its callback',
  async (target) => {
    const open = jest.spyOn(window, 'open').mockImplementation(() => null);
    const callback = jest.fn();
    const { view } = await fixture([
      action('Link', { href: '/target', target, onClick: callback }),
    ]);
    await click(view, '[data-input-actions-trigger]');
    await click(view, '[data-testid="Link"]');
    expect(open).toHaveBeenCalledWith('/target', target || '_self');
    expect(callback).not.toHaveBeenCalled();
  }
);

it('keeps fixed actions after the mounted overflow trigger and only trailing ordinary actions in overflow', async () => {
  const { view } = await fixture(
    [
      action('One'),
      action('Fixed', { fixed: true }),
      action('Two'),
      action('Three'),
    ],
    true
  );
  const row = view.querySelector('.cds-aichat-input-inline-actions');
  expect(
    [...row.children].map((child) => child.getAttribute('data-testid'))
  ).toEqual([
    'One',
    'Two',
    'Three',
    'cds-aichat-input-actions-overflow-trigger',
    'Fixed',
  ]);
  expect(
    row.querySelector('[data-testid="Fixed"]').hasAttribute('data-fixed')
  ).toBe(true);
  expect(row.hasAttribute('data-measuring')).toBe(true);
  const call = jest.mocked(connectInputActionsOverflow).mock.calls[0];
  expect(call[1]).toBe(3);
  call[2](2);
  call[3](false);
  await view.updateComplete;
  expect(row.hasAttribute('data-measuring')).toBe(false);
  await click(view, '[data-input-actions-trigger]');
  expect(
    [...view.querySelectorAll('cds-menu-item')].map(
      (item) => (item as HTMLElement & { label: string }).label
    )
  ).toEqual(['Two', 'Three']);
  call[2](0);
  await view.updateComplete;
  expect(view.querySelector('cds-menu')).toBe(null);
  expect(
    view
      .querySelector('[data-input-actions-trigger]')
      .hasAttribute('data-hidden')
  ).toBe(true);
});

it('keeps inline and overflow links, global disabling, and per-action disabling', async () => {
  const open = jest.spyOn(window, 'open').mockImplementation(() => null);
  const { view } = await fixture(
    [
      action('Inline', { href: '/inline' }),
      action('Overflow', { href: '/overflow', target: '_blank' }),
      action('Disabled', { disabled: true }),
    ],
    true
  );
  await click(view, '[data-testid="Inline"]');
  expect(open).toHaveBeenCalledWith('/inline', '_self');
  const overflow = jest.mocked(connectInputActionsOverflow).mock.calls[0];
  overflow[2](2);
  await view.updateComplete;
  await click(view, '[data-input-actions-trigger]');
  await click(view, 'cds-menu-item[data-testid="Overflow"]');
  expect(open).toHaveBeenCalledWith('/overflow', '_blank');
  view.disabled = true;
  await view.updateComplete;
  expect(
    [...view.querySelectorAll('cds-icon-button')].every((button) =>
      button.hasAttribute('disabled')
    )
  ).toBe(true);
});

it('releases each layout owner on menu close, count changes, detach, and reconnect', async () => {
  const { view, provider } = await fixture([action('One')], true);
  const initialOverflow = jest.mocked(connectInputActionsOverflow).mock
    .results[0].value;
  view.actions = [action('Other')];
  await view.updateComplete;
  expect(connectInputActionsOverflow).toHaveBeenCalledTimes(1);
  view.actions = [action('One'), action('Two')];
  await view.updateComplete;
  expect(initialOverflow).toHaveBeenCalledTimes(1);
  const overflowCall = jest.mocked(connectInputActionsOverflow).mock.calls[1];
  overflowCall[2](1);
  await view.updateComplete;
  await click(view, '[data-input-actions-trigger]');
  const releaseMenu = jest.mocked(connectInputActionsMenu).mock.results[0]
    .value;
  view
    .querySelector('cds-menu')
    .dispatchEvent(new CustomEvent('cds-menu-closed'));
  await view.updateComplete;
  expect(releaseMenu).toHaveBeenCalledTimes(1);
  const releaseOverflow = jest.mocked(connectInputActionsOverflow).mock
    .results[1].value;
  view.remove();
  expect(releaseOverflow).toHaveBeenCalledTimes(1);
  provider.shadowRoot.appendChild(view);
  await view.updateComplete;
  expect(connectInputActionsOverflow).toHaveBeenCalledTimes(3);
});

it('routes callback errors once and ignores detached action nodes', async () => {
  const selected = jest.fn(() => {
    throw new Error('action failed');
  });
  const { view, errorOccurred } = await fixture(
    [action('One', { onClick: selected })],
    true
  );
  const button = view.querySelector<HTMLElement>('[data-testid="One"]');
  button.click();
  await view.updateComplete;
  expect(errorOccurred).toHaveBeenCalledTimes(1);
  view.remove();
  button.click();
  expect(selected).toHaveBeenCalledTimes(1);
  expect(errorOccurred).toHaveBeenCalledTimes(1);
});
