/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * A native view that reads view state from the store and conversation state
 * from `instance.state` renders once for a change to both, and sees both
 * current (#2693 O11).
 */

import { LitElement, nothing } from 'lit';
import { ContextProvider } from '@lit/context';
import { NativeChatView } from '../../../src/chat/components/shared/NativeChatView';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { setIsConnecting } from '../../../src/shared/store/humanAgentActions';
import { viewActions } from '../../../src/view/state';
import type { ServiceManager } from '../../../src/shared/services/ServiceManager';
import { makeConfigStore, withPublicState } from '../../test_helpers';

class Provider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define('test-state-sources-provider', Provider);

class BothSources extends NativeChatView {
  unread = 0;
  connecting = false;
  readonly renders: Array<{ unread: number; connecting: boolean }> = [];

  protected onViewConnected() {
    this.selectStore(
      (state) => state.view.numUnreadMessages,
      (value) => {
        this.unread = value;
      }
    );
    this.selectChat(
      (state) => state.humanAgent.isConnecting,
      (value) => {
        this.connecting = value;
      }
    );
  }

  protected renderView() {
    this.renders.push({ unread: this.unread, connecting: this.connecting });
    return nothing;
  }
}
customElements.define('test-both-state-sources', BothSources);

it('renders once with both values current when one action changes both', async () => {
  const store = makeConfigStore({});
  store.dispatch(viewActions.setViewValue('numUnreadMessages', 2));
  const manager = withPublicState({ store } as unknown as ServiceManager);
  const viewState = new ChatViewState(manager, { width: 800, height: 600 });
  viewState.connect();
  const provider = document.createElement(
    'test-state-sources-provider'
  ) as Provider;
  provider.provider.setValue(viewState);
  document.body.append(provider);
  await provider.updateComplete;
  const view = document.createElement('test-both-state-sources') as BothSources;
  provider.shadowRoot.append(view);
  await view.updateComplete;
  expect(view.renders[view.renders.length - 1]).toEqual({
    unread: 2,
    connecting: false,
  });
  const before = view.renders.length;

  // Connecting sets the public agent state and, in the same dispatch, clears
  // the view's unread count.
  store.dispatch(setIsConnecting(true, 'message-1'));
  await view.updateComplete;

  expect(view.renders.slice(before)).toEqual([{ unread: 0, connecting: true }]);
  provider.remove();
  viewState.disconnect();
});
