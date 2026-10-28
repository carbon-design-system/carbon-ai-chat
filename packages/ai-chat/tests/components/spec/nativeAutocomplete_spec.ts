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
import '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line-shell.js';
import type Autocomplete from '@carbon/ai-chat-components/es/components/prompt-line/autocomplete/src/autocomplete.js';
import type PromptLine from '@carbon/ai-chat-components/es/components/prompt-line/src/prompt-line.js';
import type {
  CustomListProps,
  TriggerChangeEventDetail,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/tiptap/types.js';
import '../../../src/chat/components/input/NativeAutocomplete';
import type NativeAutocomplete from '../../../src/chat/components/input/NativeAutocomplete';
import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';
import { ChatViewState } from '../../../src/chat/services/chatViewState';
import type { ServiceManager } from '../../../src/chat/services/ServiceManager';
import { chatViewStateContext } from '../../../src/web-components/shared/chat-view-state-context';
import { createIntl } from '../../../src/chat/utils/i18n';
import actions from '../../../src/chat/store/actions';
import { ChatWidthBreakpoint } from '../../../src/types/state/AppState';
import {
  makeConfigStore,
  setupAfterEach,
  setupBeforeEach,
} from '../../test_helpers';

class AutocompleteProvider extends LitElement {
  readonly provider = new ContextProvider(this, {
    context: chatViewStateContext,
  });
  render() {
    return nothing;
  }
}
customElements.define(
  'test-native-autocomplete-provider',
  AutocompleteProvider
);

const states = new Set<ChatViewState>();
const owners = new Set<AutocompleteContent>();
const items = [
  { id: 'alpha', label: 'Alpha', value: 'Alpha value' },
  { id: 'beta', label: 'Beta' },
];

function deferred<Value>() {
  let resolve: (value: Value) => void;
  let reject: (error: unknown) => void;
  const promise = new Promise<Value>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

async function flush(view: NativeAutocomplete) {
  for (let index = 0; index < 8; index += 1) {
    await Promise.resolve();
    await view.updateComplete;
    const list = view.parentElement?.querySelector<Autocomplete>(
      'cds-aichat-autocomplete'
    );
    await list?.updateComplete;
  }
}

async function fixture(configure?: (view: NativeAutocomplete) => void) {
  const store = makeConfigStore({});
  store.dispatch(
    actions.changeState({
      chatWidthBreakpoint: ChatWidthBreakpoint.STANDARD,
      chatHeight: 601,
    })
  );
  const subscriptions = new Set<() => void>();
  const subscribe = store.subscribe;
  store.subscribe = (listener) => {
    subscriptions.add(listener);
    const release = subscribe(listener);
    return () => {
      subscriptions.delete(listener);
      release();
    };
  };
  const errorOccurred = jest.fn();
  const manager = {
    store,
    intl: createIntl({ locale: 'en', messages: store.getState().languagePack }),
    actions: { errorOccurred },
  } as unknown as ServiceManager;
  const state = new ChatViewState(manager, { width: 800, height: 601 });
  state.connect();
  states.add(state);
  const provider = document.createElement(
    'test-native-autocomplete-provider'
  ) as AutocompleteProvider;
  provider.provider.setValue(state);
  document.body.append(provider);
  await provider.updateComplete;
  const owner = new AutocompleteContent(provider);
  owner.connect();
  owners.add(owner);
  const shell = document.createElement('cds-aichat-prompt-line-shell');
  const editorDOM = document.createElement('div');
  editorDOM.tabIndex = 0;
  const prompt = document.createElement('div') as unknown as PromptLine;
  prompt.slot = 'editor';
  prompt.append(editorDOM);
  let text = '';
  const chain = {
    focus: jest.fn().mockReturnThis(),
    insertContentAt: jest.fn().mockReturnThis(),
    run: jest.fn(),
  };
  const editor = {
    view: { dom: editorDOM },
    state: { selection: { from: 4 } },
    commands: {
      insertContent: jest.fn((value: string) => {
        text += value;
      }),
    },
    chain: () => chain,
    getJSON: () => ({
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
    }),
  };
  prompt.getEditor = () =>
    editor as unknown as ReturnType<PromptLine['getEditor']>;
  const view = document.createElement(
    'cds-aichat-native-autocomplete'
  ) as NativeAutocomplete;
  view.contentOwner = owner;
  view.promptLine = prompt;
  view.autocomplete = { items };
  configure?.(view);
  shell.append(prompt, view);
  provider.shadowRoot.append(shell);
  await shell.updateComplete;
  await flush(view);
  const trigger = async (query = '', type = 'autocomplete') => {
    prompt.dispatchEvent(
      new CustomEvent<TriggerChangeEventDetail>('cds-aichat-trigger-change', {
        bubbles: true,
        composed: true,
        detail: { type, query, triggerOffset: 0 },
      })
    );
    await flush(view);
  };
  const clear = async () => {
    prompt.dispatchEvent(
      new CustomEvent('cds-aichat-trigger-change', {
        bubbles: true,
        composed: true,
        detail: null,
      })
    );
    await flush(view);
  };
  const key = (value: string) => {
    const event = new KeyboardEvent('keydown', {
      key: value,
      bubbles: true,
      cancelable: true,
    });
    editorDOM.dispatchEvent(event);
    return event;
  };
  return {
    view,
    shell,
    prompt,
    provider,
    owner,
    state,
    store,
    subscriptions,
    errorOccurred,
    editor,
    editorDOM,
    chain,
    trigger,
    clear,
    key,
  };
}

beforeEach(setupBeforeEach);
afterEach(() => {
  setupAfterEach();
  owners.forEach((owner) => owner.disconnect());
  owners.clear();
  states.forEach((state) => state.disconnect());
  states.clear();
  jest.restoreAllMocks();
});

describe('native autocomplete', () => {
  it('assigns the built-in list directly to the shell and keeps the selected layout values on the real list', async () => {
    const f = await fixture();
    await f.trigger();
    const list = f.shell.querySelector<Autocomplete>('cds-aichat-autocomplete');
    expect(f.view.hidden).toBe(true);
    expect(f.view.hasAttribute('slot')).toBe(false);
    expect(f.view.shadowRoot).toBeNull();
    expect(list.parentElement).toBe(f.shell);
    expect(list.assignedSlot).toBe(
      f.shell.shadowRoot.querySelector('slot[name="autocomplete-content"]')
    );
    expect(list.attached).toBe(true);
    expect(list.anchorElement).toBe(f.editorDOM);
    expect(
      list.style.getPropertyValue('--cds-aichat-autocomplete-max-height')
    ).toBe('240px');
    f.store.dispatch(
      actions.changeState({
        chatWidthBreakpoint: ChatWidthBreakpoint.WIDE,
        chatHeight: 1001,
      })
    );
    await flush(f.view);
    expect(f.shell.querySelector('cds-aichat-autocomplete')).toBe(list);
    expect(list.attached).toBe(false);
    expect(
      list.style.getPropertyValue('--cds-aichat-autocomplete-max-height')
    ).toBe('400px');
  });

  it('keeps the built-in empty notice mounted without trapping editor keys and omits empty custom renderers', async () => {
    const f = await fixture();
    await f.trigger('missing');
    const list = f.shell.querySelector<Autocomplete>('cds-aichat-autocomplete');
    expect(list.items).toEqual([]);
    expect(f.key('ArrowDown').defaultPrevented).toBe(false);
    const renderer = jest.fn(() => document.createElement('div'));
    f.view.autocomplete = { items, renderCustomList: renderer };
    await flush(f.view);
    expect(renderer).not.toHaveBeenCalled();
    expect(f.shell.querySelector('[slot="autocomplete-content"]')).toBeNull();
  });

  it('releases callbacks and navigation listeners from a cleared built-in list', async () => {
    const sent = jest.fn();
    const navigated = jest.fn();
    const f = await fixture((view) => {
      view.onSendItem = sent;
      view.onListNavigated = navigated;
    });
    await f.trigger();
    const list = f.shell.querySelector<Autocomplete>('cds-aichat-autocomplete');
    await f.clear();
    list.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-send', {
        detail: { text: 'retired' },
      })
    );
    list.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-navigated', {
        detail: { navigated: true },
      })
    );
    expect(sent).not.toHaveBeenCalled();
    expect(navigated).not.toHaveBeenCalled();
    expect(f.view.listNavigated).toBe(false);
    expect(f.key('ArrowDown').defaultPrevented).toBe(false);
  });

  it('waits for the actual custom element commit before forwarding keys and retains the original shadow-side placement', async () => {
    const ready = deferred<void>();
    const list = document.createElement('div') as HTMLDivElement & {
      updateComplete: Promise<void>;
      anchorElement: Element | null;
    };
    list.updateComplete = ready.promise;
    list.anchorElement = null;
    const onKey = jest.fn();
    list.addEventListener('keydown', onKey);
    const f = await fixture((view) => {
      view.autocomplete = { items, renderCustomList: () => list };
    });
    await f.trigger();
    const anchor = f.shell.querySelector<HTMLElement>(
      '[slot="autocomplete-content"]'
    );
    expect(anchor.parentElement).toBe(f.shell);
    expect(anchor.getAttribute('role')).toBe('presentation');
    expect(anchor.hasAttribute('attached')).toBe(false);
    expect(list.parentElement).toBe(anchor);
    expect(list.getRootNode()).toBe(f.provider.shadowRoot);
    expect(f.key('ArrowDown').defaultPrevented).toBe(false);
    expect(onKey).not.toHaveBeenCalled();
    ready.resolve();
    await flush(f.view);
    for (const key of ['ArrowDown', 'Enter', 'Escape']) {
      expect(f.key(key).defaultPrevented).toBe(true);
    }
    expect(onKey.mock.calls.map(([event]) => event.key)).toEqual([
      'ArrowDown',
      'Enter',
      'Escape',
    ]);
    expect(onKey.mock.calls.every(([event]) => !event.composed)).toBe(true);
    expect(list.anchorElement).toBe(f.editorDOM);
    expect(
      list.style.getPropertyValue('--cds-aichat-autocomplete-max-height')
    ).toBe('240px');
    const mouse = new MouseEvent('mousedown', {
      bubbles: true,
      cancelable: true,
    });
    list.dispatchEvent(mouse);
    expect(mouse.defaultPrevented).toBe(true);
  });

  it('clears navigation and rejects a late custom ready signal after replacement or dismissal', async () => {
    const ready = deferred<void>();
    const oldList = document.createElement('div') as HTMLDivElement & {
      updateComplete: Promise<void>;
    };
    oldList.updateComplete = ready.promise;
    const newList = document.createElement('div');
    let props: CustomListProps;
    const navigated = jest.fn();
    const f = await fixture((view) => {
      view.onListNavigated = navigated;
      view.autocomplete = {
        items,
        renderCustomList: (next) => {
          props = next;
          return next.query ? newList : oldList;
        },
      };
    });
    await f.trigger();
    const oldRequest = f.owner.getSnapshot().request;
    await f.trigger('Beta');
    newList.dispatchEvent(
      new CustomEvent('cds-aichat-autocomplete-navigated', {
        detail: { navigated: true },
      })
    );
    expect(f.view.listNavigated).toBe(true);
    const shellClear = jest.fn();
    f.shell.addEventListener('cds-aichat-autocomplete-navigated', shellClear);
    props.onDismiss();
    await flush(f.view);
    ready.resolve();
    expect(await f.owner.commit(oldRequest)).toBe(false);
    await flush(f.view);
    expect(f.view.listNavigated).toBe(false);
    expect(navigated.mock.calls.map(([value]) => value)).toEqual([true, false]);
    expect(shellClear).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { navigated: false },
        bubbles: false,
        composed: false,
      })
    );
    expect(f.owner.getSnapshot().request).toBeNull();
    expect(f.key('ArrowDown').defaultPrevented).toBe(false);
  });

  it('retains the old async result while resolving and lets only the latest query replace it', async () => {
    const pending = new Map<
      string,
      ReturnType<typeof deferred<typeof items>>
    >();
    const resolver = jest.fn((query: string) => {
      const result = deferred<typeof items>();
      pending.set(query, result);
      return result.promise;
    });
    const f = await fixture((view) => {
      view.autocomplete = { items: resolver };
    });
    await f.trigger('first');
    pending.get('first').resolve([items[0]]);
    await flush(f.view);
    const list = f.shell.querySelector<Autocomplete>('cds-aichat-autocomplete');
    await f.trigger('slow');
    expect(list.items).toEqual([items[0]]);
    await f.trigger('latest');
    pending.get('latest').resolve([items[1]]);
    await flush(f.view);
    pending.get('slow').resolve([items[0]]);
    await flush(f.view);
    expect(list.items).toEqual([items[1]]);
    f.store.dispatch(actions.setAppStateValue('chatHeight', 900));
    await flush(f.view);
    expect(resolver.mock.calls.map(([query]) => query)).toEqual([
      'first',
      'slow',
      'latest',
    ]);
  });

  it.each(['newer success', 'dismiss'] as const)(
    'ignores a rejected query after %s',
    async (next) => {
      const pending = deferred<typeof items>();
      const f = await fixture((view) => {
        view.autocomplete = {
          items: (query) => (query === 'slow' ? pending.promise : [items[1]]),
        };
      });
      await f.trigger('seed');
      const list = f.shell.querySelector<Autocomplete>(
        'cds-aichat-autocomplete'
      );
      await f.trigger('slow');
      if (next === 'newer success') {
        await f.trigger('latest');
      } else {
        list.dispatchEvent(new CustomEvent('cds-aichat-autocomplete-dismiss'));
        await flush(f.view);
      }
      pending.reject(new Error('stale query'));
      await flush(f.view);
      expect(f.errorOccurred).not.toHaveBeenCalled();
      if (next === 'newer success') {
        expect(f.shell.querySelector('cds-aichat-autocomplete')).toBe(list);
        expect(list.items).toEqual([items[1]]);
      } else {
        expect(
          f.shell.querySelector('[slot="autocomplete-content"]')
        ).toBeNull();
        expect(f.key('ArrowDown').defaultPrevented).toBe(false);
      }
    }
  );

  it.each(['remove and append', 'direct append'] as const)(
    'preserves custom content through %s and releases keys, targets, and subscriptions on actual detach',
    async (move) => {
      const list = document.createElement('div');
      list.dataset.selection = 'alpha';
      const render = jest.fn(() => list);
      const keys = jest.fn();
      list.addEventListener('keydown', keys);
      const f = await fixture((view) => {
        view.autocomplete = { items, renderCustomList: render };
      });
      await f.trigger();
      const anchor = list.parentElement;
      if (move === 'remove and append') {
        f.view.remove();
        expect(f.key('ArrowDown').defaultPrevented).toBe(false);
      }
      f.shell.appendChild(f.view);
      expect(f.key('ArrowDown').defaultPrevented).toBe(false);
      await flush(f.view);
      expect(list.parentElement).toBe(anchor);
      expect(list.dataset.selection).toBe('alpha');
      expect(render).toHaveBeenCalledTimes(1);
      expect(f.key('ArrowDown').defaultPrevented).toBe(true);
      f.view.remove();
      await flush(f.view);
      expect(f.owner.getSnapshot().request).toBeNull();
      expect(anchor.isConnected).toBe(false);
      expect(f.key('ArrowDown').defaultPrevented).toBe(false);
      expect(f.subscriptions.size).toBe(0);
      const replacement = await fixture();
      await replacement.trigger();
      expect(f.key('ArrowDown').defaultPrevented).toBe(false);
      expect(keys).toHaveBeenCalledTimes(1);
    }
  );

  it('retires custom content immediately when its view-state context changes', async () => {
    const list = document.createElement('div');
    const f = await fixture((view) => {
      view.autocomplete = { items, renderCustomList: () => list };
    });
    await f.trigger();
    const replacement = new ChatViewState(f.state.serviceManager, {
      width: 800,
      height: 601,
    });
    replacement.connect();
    states.add(replacement);
    f.provider.provider.setValue(replacement);
    expect(f.owner.getSnapshot().request).toBeNull();
    expect(list.isConnected).toBe(false);
    expect(f.key('ArrowDown').defaultPrevented).toBe(false);
    await flush(f.view);
  });

  it('leaves a borrowed element adopted by its consumer in place during update and cleanup', async () => {
    const list = document.createElement('button');
    const click = jest.fn();
    list.addEventListener('click', click);
    const f = await fixture((view) => {
      view.autocomplete = { items, renderCustomList: () => list };
    });
    await f.trigger();
    const consumer = document.createElement('section');
    document.body.append(consumer);
    consumer.append(list);
    f.store.dispatch(actions.setAppStateValue('chatHeight', 700));
    await flush(f.view);
    expect(list.parentElement).toBe(consumer);
    await f.clear();
    expect(list.parentElement).toBe(consumer);
    list.click();
    expect(click).toHaveBeenCalledTimes(1);
  });

  it('keeps selection insertion before callbacks and uses current send guards and callbacks', async () => {
    const order: string[] = [];
    let props: CustomListProps;
    const f = await fixture((view) => {
      view.autocomplete = {
        items,
        onSelect: () => order.push('config'),
        renderCustomList: (next) => {
          props = next;
          return document.createElement('div');
        },
      };
      view.onSelectItem = () => order.push('selected');
    });
    f.chain.run.mockImplementation(() => order.push('insert'));
    await f.trigger();
    props.onSelect(items[0]);
    expect(order).toEqual(['insert', 'config', 'selected']);
    await flush(f.view);
    const sent = jest.fn();
    f.view.onSendItem = sent;
    f.view.isSendDisabled = true;
    await f.trigger();
    props.onSend('');
    props.onSend('blocked');
    expect(sent).not.toHaveBeenCalled();
    f.view.isSendDisabled = false;
    await flush(f.view);
    await f.trigger();
    props.onSend('direct');
    await flush(f.view);
    expect(sent).toHaveBeenCalledWith('direct');
    expect(f.owner.getSnapshot().request).toBeNull();
  });

  it('inserts starter text before notifying its existing send owner and suppresses notification when disabled', async () => {
    const onStarter = jest.fn();
    let props: CustomListProps;
    const f = await fixture((view) => {
      view.starters = {
        items,
        renderCustomList: (next) => {
          props = next;
          return document.createElement('div');
        },
      };
      view.onStarterSelected = onStarter;
    });
    await f.trigger('', 'starter');
    props.onSelect(items[0]);
    expect(f.editor.commands.insertContent).toHaveBeenCalledWith('Alpha value');
    expect(onStarter).toHaveBeenCalledWith('Alpha value');
    f.view.isSendDisabled = true;
    await flush(f.view);
    await f.trigger('', 'starter');
    props.onSelect(items[1]);
    expect(f.editor.commands.insertContent).toHaveBeenLastCalledWith('Beta');
    expect(onStarter).toHaveBeenCalledTimes(1);
  });

  it.each(['resolver', 'renderer', 'send'] as const)(
    'routes a %s failure through the chat error owner once and releases the view',
    async (failure) => {
      const error = new Error(`${failure} failed`);
      let props: CustomListProps;
      const f = await fixture((view) => {
        view.autocomplete = {
          items:
            failure === 'resolver'
              ? async () => {
                  throw error;
                }
              : items,
          renderCustomList: (next) => {
            if (failure === 'renderer') {
              throw error;
            }
            props = next;
            return document.createElement('div');
          },
        };
        view.onSendItem = () => {
          throw error;
        };
      });
      await f.trigger();
      if (failure === 'send') {
        props.onSend('send');
        expect(f.owner.getSnapshot().request).toBeNull();
        expect(
          f.shell.querySelector('[slot="autocomplete-content"]')
        ).toBeNull();
        props.onSend('send again');
      }
      await flush(f.view);
      expect(f.errorOccurred).toHaveBeenCalledTimes(1);
      expect(f.owner.getSnapshot().request).toBeNull();
      expect(f.shell.querySelector('[slot="autocomplete-content"]')).toBeNull();
      expect(f.key('ArrowDown').defaultPrevented).toBe(false);
    }
  );

  it('reports an accepted resolver rejection even when its reason is undefined', async () => {
    const f = await fixture((view) => {
      view.autocomplete = { items: () => Promise.reject(undefined) };
    });
    await f.trigger();
    expect(f.errorOccurred).toHaveBeenCalledTimes(1);
    expect(f.errorOccurred).toHaveBeenCalledWith(
      expect.objectContaining({
        otherData: expect.objectContaining({ error: undefined }),
      })
    );
    expect(f.shell.querySelector('[slot="autocomplete-content"]')).toBeNull();
  });

  it('ignores an async failure and late result from a detached controller without affecting a second chat', async () => {
    const pending = deferred<typeof items>();
    const first = await fixture((view) => {
      view.autocomplete = { items: () => pending.promise };
    });
    const second = await fixture();
    await first.trigger();
    first.view.remove();
    await flush(first.view);
    await second.trigger();
    pending.reject(new Error('retired'));
    await flush(second.view);
    expect(first.errorOccurred).not.toHaveBeenCalled();
    expect(second.errorOccurred).not.toHaveBeenCalled();
    expect(
      second.shell.querySelector<Autocomplete>('cds-aichat-autocomplete').items
    ).toEqual(items);
    expect(first.key('ArrowDown').defaultPrevented).toBe(false);
  });
});
