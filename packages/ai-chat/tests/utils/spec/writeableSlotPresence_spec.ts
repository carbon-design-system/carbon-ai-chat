/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { observeWriteableSlotPresence } from '../../../src/chat/utils/writeableSlotPresence';

function fixture() {
  const host = document.createElement('div');
  const slot = document.createElement('slot');
  slot.name = 'content';
  host.attachShadow({ mode: 'open' }).appendChild(slot);
  const content = document.createElement('div');
  content.slot = 'content';
  host.appendChild(content);
  document.body.appendChild(host);
  const changed = jest.fn();
  const release = observeWriteableSlotPresence(slot, changed);
  return { host, slot, content, changed, release };
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('ignores empty wrappers and keeps the exact late consumer node and listeners', async () => {
  const f = fixture();
  expect(f.changed).toHaveBeenLastCalledWith(false);
  const button = document.createElement('button');
  const clicked = jest.fn();
  button.addEventListener('click', clicked);
  f.content.appendChild(button);
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(true);
  expect(f.content.firstChild).toBe(button);
  button.click();
  expect(clicked).toHaveBeenCalledTimes(1);
  button.remove();
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(false);
  f.release();
});

it('keeps a wrapper occupied while it contains a text node', async () => {
  const f = fixture();
  f.content.textContent = '   ';
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(true);
  f.content.textContent = '';
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(false);
  f.release();
});

it('tracks whitespace and text changes in a directly assigned text node', async () => {
  const f = fixture();
  f.content.remove();
  f.slot.name = '';
  const text = document.createTextNode('   ');
  f.host.appendChild(text);
  f.slot.dispatchEvent(new Event('slotchange'));
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(false);
  text.data = 'Ready';
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(true);
  text.data = ' ';
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(false);
  f.release();
});

it('retargets assignment and stops observing old nodes and released content', async () => {
  const f = fixture();
  const replacement = document.createElement('div');
  replacement.slot = 'content';
  replacement.textContent = 'Late';
  f.content.remove();
  f.host.appendChild(replacement);
  f.slot.dispatchEvent(new Event('slotchange'));
  await Promise.resolve();
  expect(f.changed).toHaveBeenLastCalledWith(true);
  f.changed.mockClear();
  f.content.textContent = 'Old';
  await Promise.resolve();
  expect(f.changed).not.toHaveBeenCalled();
  f.release();
  replacement.textContent = '';
  f.slot.dispatchEvent(new Event('slotchange'));
  await Promise.resolve();
  expect(f.changed).not.toHaveBeenCalled();
  expect(replacement.parentNode).toBe(f.host);
});
