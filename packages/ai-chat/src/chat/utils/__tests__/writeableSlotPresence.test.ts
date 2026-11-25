/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { observeWriteableSlotPresence } from '../writeableSlotPresence';

function fixture() {
  const host = document.createElement('div');
  const slot = document.createElement('slot');
  slot.name = 'content';
  host.attachShadow({ mode: 'open' }).appendChild(slot);
  const content = document.createElement('div');
  content.slot = 'content';
  host.appendChild(content);
  document.body.appendChild(host);
  const changed = vi.fn();
  const release = observeWriteableSlotPresence(slot, changed);
  return { host, slot, content, changed, release };
}

afterEach(() => {
  document.body.innerHTML = '';
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
