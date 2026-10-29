/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { act, fireEvent, render, waitFor } from '@testing-library/react';
import { AutocompleteContentAdapter } from '../../../src/chat/components/input/AutocompleteContentAdapter';
import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';

const Context = createContext('missing');

function fixture() {
  const wrapper = document.createElement('div');
  wrapper.className = 'page-suggestions';
  const shadow = wrapper.attachShadow({ mode: 'open' });
  const anchor = document.createElement('div');
  anchor.slot = 'autocomplete-content';
  shadow.appendChild(anchor);
  document.body.appendChild(wrapper);
  const contentOwner = new AutocompleteContent(wrapper);
  contentOwner.connect();
  const owner = {};
  contentOwner.claim(owner);
  const callbacks = {
    onReady: jest.fn(),
    onClear: jest.fn(),
    onError: jest.fn(),
  };
  return { wrapper, shadow, anchor, contentOwner, owner, callbacks };
}

function deferred() {
  let resolve: () => void;
  const promise = new Promise<void>((done) => {
    resolve = done;
  });
  return { promise, resolve: () => resolve() };
}

afterEach(() => {
  document.body.replaceChildren();
});

it('mounts only after placement and preserves parent context, state and the page target across queries and results', async () => {
  const { wrapper, anchor, contentOwner, owner, callbacks } = fixture();
  const firstEffects: Array<{ connected: boolean; assigned: boolean }> = [];
  const effects: string[] = [];
  function Suggestions({
    query,
    results,
  }: {
    query: string;
    results: string[];
  }) {
    const context = useContext(Context);
    const [count, setCount] = useState(0);
    const ref = useRef<HTMLButtonElement>(null);
    useLayoutEffect(() => {
      firstEffects.push({
        connected: ref.current.isConnected,
        assigned: Boolean(ref.current.parentElement.assignedSlot),
      });
    }, []);
    useEffect(() => {
      effects.push(query);
    }, [query]);
    return (
      <button
        type="button"
        ref={ref}
        data-suggestions=""
        onClick={() => setCount(count + 1)}>
        {context}:{count}:{query}:{results.join(',')}
      </button>
    );
  }
  const first = contentOwner.prepare(
    owner,
    {},
    <Suggestions query="a" results={['alpha']} />,
    anchor,
    callbacks
  );
  const tree = (context: string) => (
    <Context.Provider value={context}>
      <AutocompleteContentAdapter contentOwner={contentOwner} />
    </Context.Provider>
  );
  const mounted = render(tree('host'));
  expect(firstEffects).toHaveLength(0);
  expect(first.target.childNodes).toHaveLength(0);
  expect(callbacks.onReady).not.toHaveBeenCalled();
  callbacks.onReady.mockImplementation(() => expect(effects).toContain('a'));
  act(() => {
    expect(contentOwner.markPlaced(first)).toBe(true);
  });
  await waitFor(() => expect(callbacks.onReady).toHaveBeenCalledTimes(1));
  const button = first.target.querySelector('button');
  expect(firstEffects).toEqual([{ connected: true, assigned: true }]);
  expect(first.target.parentElement).toBe(wrapper);
  expect(first.target.getRootNode()).toBe(document);
  expect(first.target.assignedSlot.parentElement).toBe(anchor);
  expect(button.matches('.page-suggestions [data-suggestions]')).toBe(true);
  fireEvent.click(button);
  expect(button.textContent).toBe('host:1:a:alpha');

  let next: ReturnType<AutocompleteContent['prepare']>;
  act(() => {
    next = contentOwner.prepare(
      owner,
      {},
      <Suggestions query="ab" results={['about', 'above']} />,
      anchor,
      callbacks
    );
  });
  expect(next.target).toBe(first.target);
  expect(next.target.querySelector('button')).toBe(button);
  expect(button.textContent).toBe('host:1:a:alpha');
  expect(contentOwner.isReady(next)).toBe(false);
  callbacks.onReady.mockImplementation(() => expect(effects).toContain('ab'));
  act(() => {
    contentOwner.markPlaced(next);
  });
  await waitFor(() => expect(button.textContent).toBe('host:1:ab:about,above'));
  await waitFor(() => expect(contentOwner.isReady(next)).toBe(true));
  expect(next.target.querySelector('button')).toBe(button);
  mounted.rerender(tree('updated'));
  expect(button.textContent).toBe('updated:1:ab:about,above');
  expect(firstEffects).toHaveLength(1);
  mounted.unmount();
  contentOwner.disconnect();
});

it.each([
  ['acknowledges the list after its delayed update', false],
  ['ignores a delayed update after clearing the list', true],
] as const)('%s', async (_name, clear) => {
  const { anchor, contentOwner, owner, callbacks } = fixture();
  const update = deferred();
  const consumerEffect = jest.fn();
  function Suggestions() {
    const ref = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
      Object.assign(ref.current, { updateComplete: update.promise });
    }, []);
    useEffect(consumerEffect, []);
    return <div ref={ref}>Delayed list</div>;
  }
  const request = contentOwner.prepare(
    owner,
    {},
    <Suggestions />,
    anchor,
    callbacks
  );
  const mounted = render(
    <AutocompleteContentAdapter contentOwner={contentOwner} />
  );
  act(() => {
    contentOwner.markPlaced(request);
  });
  expect(consumerEffect).toHaveBeenCalledTimes(1);
  expect(request.target.textContent).toBe('Delayed list');
  expect(callbacks.onReady).not.toHaveBeenCalled();
  if (clear) {
    act(() => contentOwner.clear(owner));
  }
  await act(async () => update.resolve());
  if (clear) {
    expect(callbacks.onReady).not.toHaveBeenCalled();
    expect(request.target.isConnected).toBe(false);
    expect(contentOwner.getSnapshot().request).toBeNull();
  } else {
    expect(callbacks.onReady).toHaveBeenCalledWith(
      request.target.firstElementChild
    );
    expect(contentOwner.isReady(request)).toBe(true);
  }
  mounted.unmount();
  contentOwner.disconnect();
});

it('acknowledges a consumer local-state root replacement after its effects without remounting the list', async () => {
  const { anchor, contentOwner, owner, callbacks } = fixture();
  const mounts = jest.fn();
  const effects: string[] = [];
  function Suggestions() {
    const [replace, setReplace] = useState(false);
    const [count, setCount] = useState(0);
    useEffect(mounts, []);
    useEffect(() => {
      effects.push(replace ? 'section' : 'div');
    }, [replace]);
    const contents = (
      <>
        <button type="button" onClick={() => setCount(count + 1)}>
          Count {count}
        </button>
        <button type="button" onClick={() => setReplace(true)}>
          Replace root
        </button>
      </>
    );
    return replace ? <section>{contents}</section> : <div>{contents}</div>;
  }
  const request = contentOwner.prepare(
    owner,
    {},
    <Suggestions />,
    anchor,
    callbacks
  );
  callbacks.onReady.mockImplementation((list: HTMLElement) => {
    expect(effects).toContain(list.tagName.toLowerCase());
  });
  const mounted = render(
    <AutocompleteContentAdapter contentOwner={contentOwner} />
  );
  act(() => {
    contentOwner.markPlaced(request);
  });
  await waitFor(() => expect(callbacks.onReady).toHaveBeenCalledTimes(1));
  const target = request.target;
  const original = target.firstElementChild;
  fireEvent.click(target.querySelector('button'));
  fireEvent.click(target.querySelectorAll('button')[1]);
  await waitFor(() => expect(callbacks.onReady).toHaveBeenCalledTimes(2));
  expect(callbacks.onReady).toHaveBeenLastCalledWith(target.firstElementChild);
  expect(target.firstElementChild.tagName).toBe('SECTION');
  expect(target.firstElementChild).not.toBe(original);
  expect(target.textContent).toContain('Count 1');
  expect(mounts).toHaveBeenCalledTimes(1);
  expect(contentOwner.getSnapshot().request.target).toBe(target);
  expect(callbacks.onClear).toHaveBeenCalled();
  mounted.unmount();
  contentOwner.disconnect();
});

it('keeps HTMLElement results directly borrowed and their event listeners intact', async () => {
  const { anchor, contentOwner, owner, callbacks } = fixture();
  const element = document.createElement('button');
  element.textContent = 'Borrowed list';
  const clicked = jest.fn();
  element.addEventListener('click', clicked);
  const request = contentOwner.prepare(owner, {}, element, anchor, callbacks);
  const mounted = render(
    <AutocompleteContentAdapter contentOwner={contentOwner} />
  );
  act(() => {
    contentOwner.markPlaced(request);
  });
  await contentOwner.commit(request);
  expect(element.parentElement).toBe(anchor);
  expect(element.getRootNode()).toBe(anchor.getRootNode());
  fireEvent.click(element);
  expect(clicked).toHaveBeenCalledTimes(1);
  expect(callbacks.onReady).toHaveBeenCalledWith(element);
  const consumer = document.createElement('div');
  document.body.appendChild(consumer);
  consumer.appendChild(element);
  mounted.rerender(<AutocompleteContentAdapter contentOwner={contentOwner} />);
  act(() => contentOwner.clear(owner));
  expect(element.parentElement).toBe(consumer);
  mounted.unmount();
  contentOwner.disconnect();
});

it('routes a later consumer render failure once and clears its ready target', async () => {
  const { anchor, contentOwner, owner, callbacks } = fixture();
  const error = new Error('Consumer list failed');
  function Suggestions() {
    const [failed, setFailed] = useState(false);
    if (failed) {
      throw error;
    }
    return (
      <button type="button" onClick={() => setFailed(true)}>
        Fail later
      </button>
    );
  }
  const request = contentOwner.prepare(
    owner,
    {},
    <Suggestions />,
    anchor,
    callbacks
  );
  const consoleError = jest
    .spyOn(console, 'error')
    .mockImplementation(() => {});
  const mounted = render(
    <AutocompleteContentAdapter contentOwner={contentOwner} />
  );
  try {
    act(() => {
      contentOwner.markPlaced(request);
    });
    await waitFor(() => expect(callbacks.onReady).toHaveBeenCalledTimes(1));
    fireEvent.click(request.target.querySelector('button'));
    expect(callbacks.onError).toHaveBeenCalledTimes(1);
    expect(callbacks.onError).toHaveBeenCalledWith(error);
    expect(contentOwner.isReady(request)).toBe(false);
    expect(callbacks.onClear).toHaveBeenCalled();
  } finally {
    mounted.unmount();
    contentOwner.disconnect();
    consoleError.mockRestore();
  }
});

it('preserves the portal through a same-task placement move and retires it on actual release', async () => {
  const { shadow, anchor, contentOwner, owner, callbacks } = fixture();
  function Suggestions() {
    const [count, setCount] = useState(0);
    return (
      <button type="button" onClick={() => setCount(count + 1)}>
        Count {count}
      </button>
    );
  }
  const request = contentOwner.prepare(
    owner,
    {},
    <Suggestions />,
    anchor,
    callbacks
  );
  const mounted = render(
    <AutocompleteContentAdapter contentOwner={contentOwner} />
  );
  act(() => {
    contentOwner.markPlaced(request);
  });
  await waitFor(() => expect(contentOwner.isReady(request)).toBe(true));
  const button = request.target.querySelector('button');
  fireEvent.click(button);
  let resumed: typeof request;
  act(() => {
    contentOwner.pause(owner);
    anchor.remove();
    shadow.appendChild(anchor);
    resumed = contentOwner.getSnapshot().request;
    contentOwner.markPlaced(resumed);
  });
  await waitFor(() => expect(contentOwner.isReady(resumed)).toBe(true));
  expect(contentOwner.isReady(request)).toBe(false);
  expect(resumed.target).toBe(request.target);
  expect(resumed.target.querySelector('button')).toBe(button);
  expect(button.textContent).toBe('Count 1');
  act(() => contentOwner.release(owner));
  expect(request.target.isConnected).toBe(false);
  expect(contentOwner.isReady(request)).toBe(false);
  expect(await contentOwner.commit(request)).toBe(false);
  mounted.unmount();
  contentOwner.disconnect();
});
