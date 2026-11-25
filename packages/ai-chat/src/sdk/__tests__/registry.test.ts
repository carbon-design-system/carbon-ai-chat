/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { Mock as VitestMock } from 'vitest';
import { createChatRegistry, DEFAULT_RELEASE_GRACE_MS } from '../registry';
import { resolvablePromise } from '../utils/resolvablePromise';

interface FakeChat {
  id: number;
  shutdown: VitestMock<(...args: []) => Promise<void>>;
}

let nextID = 0;

function fakeChat(shutdown = () => Promise.resolve()): FakeChat {
  nextID += 1;
  return { id: nextID, shutdown: vi.fn(shutdown) };
}

/** Claim options whose boot and adopt calls the test can watch and steer. */
function options({
  boot = () => Promise.resolve(fakeChat()),
  adopt = () => Promise.resolve(),
  releaseGraceMs,
}: {
  boot?: () => Promise<FakeChat>;
  adopt?: (chat: FakeChat) => Promise<void>;
  releaseGraceMs?: () => number | undefined;
} = {}) {
  return {
    boot: vi.fn(boot),
    adopt: vi.fn(adopt),
    releaseGraceMs,
  };
}

/** Lets promise callbacks run while timers stay fake. */
async function settle() {
  for (let i = 0; i < 10; i += 1) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('chat registry (#2357)', () => {
  it('O9: expiry waits for boot to finish, then shuts the chat down', async () => {
    const registry = createChatRegistry<FakeChat>();
    const boot = resolvablePromise<FakeChat>();
    const claim = registry.claim('support', options({ boot: () => boot }));
    claim.release();

    vi.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    const chat = fakeChat();
    expect(chat.shutdown).not.toHaveBeenCalled();
    boot.doResolve(chat);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it("a boot that fails after expiry leaves the next chat's claim in place", async () => {
    const registry = createChatRegistry<FakeChat>();
    const boot = resolvablePromise<FakeChat>();
    const firstClaim = registry.claim('support', options({ boot: () => boot }));
    firstClaim.release();
    vi.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);

    const nextBoot = resolvablePromise<FakeChat>();
    registry.claim('support', options({ boot: () => nextBoot }));
    boot.doReject(new Error('boot failed'));
    await expect(firstClaim.chat).rejects.toThrow('boot failed');
    await settle();

    // The second chat is still booting and still claimed.
    expect(() => registry.claim('support', options())).toThrow(
      /already running/
    );
  });
});

describe('ending a chat (#2358 O1, O4, as destroy uses it)', () => {
  it('an adoption still waiting rejects, naming the namespace, and skips adopt; a running one doesn’t hold up the end', async () => {
    const registry = createChatRegistry<FakeChat>();
    const slow = resolvablePromise<void>();
    const firstClaim = registry.claim('support', options());
    const chat = await firstClaim.chat;
    firstClaim.release();
    // This adoption holds the queue, so the next one waits behind it.
    const adoptingOptions = options({ adopt: () => slow });
    const adopting = registry.claim('support', adoptingOptions);
    await settle();
    expect(adoptingOptions.adopt).toHaveBeenCalledWith(chat);
    adopting.release();
    const waiting = options();
    const waitingClaim = registry.claim('support', waiting);

    firstClaim.end();
    await settle();
    // Now, not after the running adoption, which may never settle.
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
    const next = options();
    const nextClaim = registry.claim('support', next);
    await expect(nextClaim.chat).resolves.not.toBe(chat);
    expect(next.boot).toHaveBeenCalledTimes(1);

    const rejected = Promise.all([
      expect(adopting.chat).rejects.toThrow(
        'A chat with the namespace "support" was destroyed while this one waited to reuse it'
      ),
      expect(waitingClaim.chat).rejects.toThrow(/was destroyed/),
    ]);
    slow.doResolve();
    await rejected;
    expect(waiting.adopt).not.toHaveBeenCalled();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it('destroys a chat that can be destroyed, even one still booting; expiry and a kind change only shut down', async () => {
    const destroyable = () => {
      const chat = fakeChat();
      return Object.assign(chat, { destroy: vi.fn(() => Promise.resolve()) });
    };
    const registry = createChatRegistry<FakeChat & { destroy?: VitestMock }>();
    const boot = resolvablePromise<FakeChat & { destroy: VitestMock }>();
    const booting = registry.claim('ended', options({ boot: () => boot }));
    booting.end();
    const ended = destroyable();
    boot.doResolve(ended);
    await expect(booting.chat).rejects.toThrow(/was destroyed/);
    await settle();
    expect(ended.destroy).toHaveBeenCalledTimes(1);
    expect(ended.shutdown).not.toHaveBeenCalled();

    const expiring = destroyable();
    const expiringClaim = registry.claim(
      'expired',
      options({ boot: () => Promise.resolve(expiring) })
    );
    await expiringClaim.chat;
    expiringClaim.release();
    vi.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    expect(expiring.shutdown).toHaveBeenCalledTimes(1);

    const replaced = destroyable();
    const replacedClaim = registry.claim(
      'kind',
      options({ boot: () => Promise.resolve(replaced) })
    );
    await replacedClaim.chat;
    replacedClaim.release();
    await registry.claim('kind', { ...options(), kind: 'other' }).chat;
    await settle();
    expect(replaced.shutdown).toHaveBeenCalledTimes(1);
    expect(expiring.destroy).not.toHaveBeenCalled();
    expect(replaced.destroy).not.toHaveBeenCalled();
  });
});
