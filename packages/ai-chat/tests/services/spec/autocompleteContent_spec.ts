/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { AutocompleteContent } from '../../../src/chat/services/autocompleteContent';

function fixture() {
  const wrapper = document.createElement('div');
  const shadow = wrapper.attachShadow({ mode: 'open' });
  const anchor = document.createElement('div');
  shadow.appendChild(anchor);
  document.body.appendChild(wrapper);
  const content = new AutocompleteContent(wrapper);
  const owner = {};
  const callbacks = {
    onReady: jest.fn(),
    onClear: jest.fn(),
    onError: jest.fn(),
  };
  content.connect();
  content.claim(owner);
  return { wrapper, shadow, anchor, content, owner, callbacks };
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('settles retired readiness without waiting for a consumer update that never completes', async () => {
  const f = fixture();
  const request = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(request);
  const list = document.createElement('div');
  Object.defineProperty(list, 'updateComplete', {
    value: new Promise(() => {}),
  });
  request.target.appendChild(list);
  const pending = f.content.commit(request);
  f.content.clear(f.owner);
  expect(await pending).toBe(false);
  expect(f.callbacks.onReady).not.toHaveBeenCalled();
  expect(request.target.isConnected).toBe(false);
  f.content.disconnect();
});

it('places a stable page-light-DOM target before a React commit can make its real list ready', async () => {
  const f = fixture();
  const request = f.content.prepare(
    f.owner,
    {},
    { node: 'react' },
    f.anchor,
    f.callbacks
  );
  expect(request.target.isConnected).toBe(false);
  expect(await f.content.commit(request)).toBe(false);
  expect(f.content.markPlaced(request)).toBe(true);
  expect(request.target.parentElement).toBe(f.wrapper);
  expect(request.target.getRootNode()).toBe(document);
  expect(request.target.assignedSlot?.parentElement).toBe(f.anchor);
  expect(f.callbacks.onReady).not.toHaveBeenCalled();
  const list = document.createElement('button');
  request.target.appendChild(list);
  expect(await f.content.commit(request)).toBe(true);
  expect(f.callbacks.onReady).toHaveBeenCalledWith(list);
  expect(await f.content.commit(request)).toBe(true);
  expect(f.callbacks.onReady).toHaveBeenCalledTimes(1);
  f.content.disconnect();
});

it('clears routing before a query replacement while keeping the portal target and slot', async () => {
  const f = fixture();
  const first = f.content.prepare(
    f.owner,
    {},
    { node: 'first' },
    f.anchor,
    f.callbacks
  );
  f.content.markPlaced(first);
  const firstList = document.createElement('div');
  first.target.append(firstList);
  await f.content.commit(first);
  const slot = first.target.assignedSlot;
  const revision = {};
  const node = { node: 'next' };
  const next = f.content.prepare(
    f.owner,
    revision,
    node,
    f.anchor,
    f.callbacks
  );
  expect(f.callbacks.onClear).toHaveBeenCalledTimes(1);
  expect(next.target).toBe(first.target);
  expect(
    f.content.prepare(f.owner, revision, node, f.anchor, f.callbacks)
  ).toBe(next);
  expect(await f.content.commit(first)).toBe(false);
  expect(f.content.isReady(next)).toBe(false);
  f.content.markPlaced(next);
  expect(next.target.assignedSlot).toBe(slot);
  const nextList = document.createElement('section');
  next.target.replaceChildren(nextList);
  await f.content.commit(next);
  expect(f.callbacks.onReady).toHaveBeenLastCalledWith(nextList);
  f.content.disconnect();
});

it('rejects a late child update after the list generation has been replaced', async () => {
  const f = fixture();
  const first = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(first);
  const list = document.createElement('div');
  let finish: () => void;
  Object.defineProperty(list, 'updateComplete', {
    value: new Promise<void>((resolve) => {
      finish = resolve;
    }),
  });
  first.target.appendChild(list);
  const pending = f.content.commit(first);
  const next = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(next);
  const nextList = document.createElement('button');
  next.target.replaceChildren(nextList);
  await f.content.commit(next);
  finish();
  expect(await pending).toBe(false);
  expect(f.callbacks.onReady).toHaveBeenCalledTimes(1);
  expect(f.callbacks.onReady).toHaveBeenCalledWith(nextList);
  f.content.disconnect();
});

it('invalidates a local root replacement without changing its render record or snapshot', async () => {
  const f = fixture();
  const request = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(request);
  request.target.appendChild(document.createElement('button'));
  await f.content.commit(request);
  const snapshot = f.content.getSnapshot();
  const replacement = document.createElement('section');
  request.target.replaceChildren(replacement);
  f.content.invalidateReady(request);
  expect(f.content.getSnapshot()).toBe(snapshot);
  expect(f.content.isReady(request)).toBe(false);
  expect(f.callbacks.onClear).toHaveBeenCalledTimes(1);
  await f.content.commit(request);
  expect(f.callbacks.onReady).toHaveBeenLastCalledWith(replacement);
  f.content.disconnect();
});

it('does not remove or reclaim a borrowed element that the consumer adopted elsewhere', async () => {
  const f = fixture();
  const borrowed = document.createElement('button');
  const request = f.content.prepare(
    f.owner,
    {},
    borrowed,
    f.anchor,
    f.callbacks
  );
  f.content.markPlaced(request);
  expect(f.callbacks.onReady).toHaveBeenCalledWith(borrowed);
  const consumer = document.createElement('section');
  document.body.appendChild(consumer);
  consumer.appendChild(borrowed);
  await Promise.resolve();
  expect(f.callbacks.onClear).toHaveBeenCalledTimes(1);
  expect(f.content.markPlaced(request)).toBe(false);
  expect(borrowed.parentElement).toBe(consumer);
  f.content.clear(f.owner);
  expect(borrowed.parentElement).toBe(consumer);
  expect(f.content.getSnapshot().request).toBe(null);
  f.content.disconnect();
});

it('preserves DOM through pause and requires a new commit before routing resumes', async () => {
  const f = fixture();
  const request = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(request);
  const list = document.createElement('button');
  request.target.appendChild(list);
  await f.content.commit(request);
  f.content.pause(f.owner);
  const resumed = f.content.getSnapshot().request;
  expect(resumed).not.toBe(request);
  expect(resumed.target).toBe(request.target);
  f.anchor.remove();
  f.shadow.appendChild(f.anchor);
  expect(await f.content.commit(request)).toBe(false);
  expect(f.content.isReady(resumed)).toBe(false);
  f.content.markPlaced(resumed);
  await f.content.commit(resumed);
  expect(f.callbacks.onReady).toHaveBeenLastCalledWith(list);
  expect(resumed.target.firstElementChild).toBe(list);
  f.content.disconnect();
  expect(resumed.target.isConnected).toBe(false);
});

it('rejects a retired view and placement under another chat', async () => {
  const f = fixture();
  const old = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(old);
  const replacementOwner = {};
  f.content.claim(replacementOwner);
  expect(await f.content.commit(old)).toBe(false);
  expect(
    f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks)
  ).toBeUndefined();
  const other = fixture();
  const request = f.content.prepare(
    replacementOwner,
    {},
    {},
    other.anchor,
    f.callbacks
  );
  expect(f.content.markPlaced(request)).toBe(false);
  f.content.disconnect();
  other.content.disconnect();
});

it('releases DOM before reporting one ready failure, even if clearing routing also throws', async () => {
  const f = fixture();
  const error = new Error('ready failed');
  f.callbacks.onReady.mockImplementation(() => {
    throw error;
  });
  f.callbacks.onClear.mockImplementation(() => {
    throw new Error('clear failed');
  });
  const request = f.content.prepare(f.owner, {}, {}, f.anchor, f.callbacks);
  f.content.markPlaced(request);
  request.target.appendChild(document.createElement('button'));
  expect(await f.content.commit(request)).toBe(false);
  expect(f.callbacks.onError).toHaveBeenCalledTimes(1);
  expect(f.callbacks.onError).toHaveBeenCalledWith(error);
  expect(request.target.isConnected).toBe(false);
  expect(f.content.getSnapshot().request).toBe(null);
  f.content.fail(request, new Error('late failure'));
  expect(f.callbacks.onError).toHaveBeenCalledTimes(1);
  f.content.disconnect();
});
