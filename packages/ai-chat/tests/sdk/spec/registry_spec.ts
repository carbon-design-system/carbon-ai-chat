/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  createChatRegistry,
  DEFAULT_RELEASE_GRACE_MS,
} from '../../../src/sdk/registry';
import {
  resolvablePromise,
  type ResolvablePromise,
} from '../../../src/sdk/utils/resolvablePromise';

interface FakeChat {
  id: number;
  shutdown: jest.Mock<Promise<void>, []>;
}

let nextID = 0;

function fakeChat(shutdown = () => Promise.resolve()): FakeChat {
  nextID += 1;
  return { id: nextID, shutdown: jest.fn(shutdown) };
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
    boot: jest.fn(boot),
    adopt: jest.fn(adopt),
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
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('chat registry (#2357)', () => {
  it('O4: adopting in the grace window cancels the shutdown and keeps the chat', async () => {
    const registry = createChatRegistry<FakeChat>();
    const first = options();
    const firstClaim = registry.claim('support', first);
    const chat = await firstClaim.chat;
    firstClaim.release();

    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS - 1);
    const second = options();
    const secondClaim = registry.claim('support', second);
    await expect(secondClaim.chat).resolves.toBe(chat);

    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS * 2);
    await settle();
    expect(chat.shutdown).not.toHaveBeenCalled();
    expect(first.boot).toHaveBeenCalledTimes(1);
    expect(second.boot).not.toHaveBeenCalled();
  });

  it('O4: after adoption, the next release gets a full window of its own', async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim('support', options());
    const chat = await firstClaim.chat;
    firstClaim.release();
    jest.advanceTimersByTime(1000);
    const secondClaim = registry.claim('support', options());
    await secondClaim.chat;
    jest.advanceTimersByTime(1000);
    secondClaim.release();

    // The first window would have ended here.
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS - 1);
    await settle();
    expect(chat.shutdown).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it('O15 (registry half): adopt runs only on reuse, with the running chat', async () => {
    const registry = createChatRegistry<FakeChat>();
    const first = options();
    const firstClaim = registry.claim('support', first);
    const chat = await firstClaim.chat;
    expect(first.adopt).not.toHaveBeenCalled();
    firstClaim.release();

    const second = options();
    await registry.claim('support', second).chat;
    expect(second.adopt).toHaveBeenCalledTimes(1);
    expect(second.adopt).toHaveBeenCalledWith(chat);
  });

  it('O5: a missing namespace is the empty one, with the same rules', async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim(undefined, options());
    expect(() => registry.claim('', options())).toThrow(
      "A chat with no namespace is already running, so this one didn't start. Give each chat its own namespace."
    );
    const chat = await firstClaim.chat;
    firstClaim.release();

    await expect(registry.claim('', options()).chat).resolves.toBe(chat);
  });

  it('O5: different namespaces hold different chats', async () => {
    const registry = createChatRegistry<FakeChat>();
    const a = await registry.claim('a', options()).chat;
    const b = await registry.claim('b', options()).chat;
    expect(a).not.toBe(b);
  });

  it('O6, O12 (registry half): a claim is taken before boot finishes, so a second claim collides', () => {
    const registry = createChatRegistry<FakeChat>();
    const boot = resolvablePromise<FakeChat>();
    const first = options({ boot: () => boot });
    registry.claim('support', first);

    const second = options();
    expect(() => registry.claim('support', second)).toThrow(
      'A chat with the namespace "support" is already running, so this one didn\'t start. Give each chat its own namespace.'
    );
    expect(second.boot).not.toHaveBeenCalled();
    expect(second.adopt).not.toHaveBeenCalled();
  });

  it('O7: releasing a claim again does nothing', async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim('support', options());
    const chat = await firstClaim.chat;
    firstClaim.release();
    const secondClaim = registry.claim('support', options());
    await secondClaim.chat;

    // The old claim's release must not release the claim that took over.
    firstClaim.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS * 2);
    await settle();
    expect(chat.shutdown).not.toHaveBeenCalled();
    expect(() => registry.claim('support', options())).toThrow(
      /already running/
    );

    // Nor does the live claim's second release restart the window.
    secondClaim.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS - 1);
    secondClaim.release();
    jest.advanceTimersByTime(1);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it('O8: the last release starts a 3000 ms window by default', async () => {
    expect(DEFAULT_RELEASE_GRACE_MS).toBe(3000);
    const registry = createChatRegistry<FakeChat>();
    const claim = registry.claim('support', options());
    const chat = await claim.chat;

    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS * 2);
    await settle();
    expect(chat.shutdown).not.toHaveBeenCalled();

    claim.release();
    jest.advanceTimersByTime(2999);
    await settle();
    expect(chat.shutdown).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it('O8: the window reads releaseGraceMs when the claim is released', async () => {
    const registry = createChatRegistry<FakeChat>();
    let graceMs = 50;
    const claim = registry.claim(
      'support',
      options({ releaseGraceMs: () => graceMs })
    );
    const chat = await claim.chat;
    graceMs = 500;
    claim.release();

    jest.advanceTimersByTime(499);
    await settle();
    expect(chat.shutdown).not.toHaveBeenCalled();
    jest.advanceTimersByTime(1);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it.each([[-1], [Number.NaN], [Number.POSITIVE_INFINITY], [undefined]])(
    'O8: a releaseGraceMs of %p means the default',
    async (graceMs) => {
      const registry = createChatRegistry<FakeChat>();
      const claim = registry.claim(
        'support',
        options({ releaseGraceMs: () => graceMs })
      );
      const chat = await claim.chat;
      claim.release();

      jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS - 1);
      await settle();
      expect(chat.shutdown).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1);
      await settle();
      expect(chat.shutdown).toHaveBeenCalledTimes(1);
    }
  );

  it("O8: adoption reads the adopting claim's window", async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim(
      'support',
      options({ releaseGraceMs: () => 5000 })
    );
    const chat = await firstClaim.chat;
    firstClaim.release();
    const secondClaim = registry.claim(
      'support',
      options({ releaseGraceMs: () => 100 })
    );
    await secondClaim.chat;
    secondClaim.release();

    jest.advanceTimersByTime(100);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it('O9: expiry waits for boot to finish, then shuts the chat down', async () => {
    const registry = createChatRegistry<FakeChat>();
    const boot = resolvablePromise<FakeChat>();
    const claim = registry.claim('support', options({ boot: () => boot }));
    claim.release();

    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    const chat = fakeChat();
    expect(chat.shutdown).not.toHaveBeenCalled();
    boot.doResolve(chat);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });

  it('O9: once expired, the namespace boots a new chat', async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim('support', options());
    const first = await firstClaim.chat;
    firstClaim.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();

    const second = options();
    const chat = await registry.claim('support', second).chat;
    expect(chat).not.toBe(first);
    expect(second.boot).toHaveBeenCalledTimes(1);
    expect(second.adopt).not.toHaveBeenCalled();
  });

  it('O10: adoption during boot waits for boot to finish', async () => {
    const registry = createChatRegistry<FakeChat>();
    const boot = resolvablePromise<FakeChat>();
    const firstClaim = registry.claim('support', options({ boot: () => boot }));
    firstClaim.release();

    const second = options();
    let adopted: FakeChat | undefined;
    void registry.claim('support', second).chat.then((chat) => {
      adopted = chat;
    });
    await settle();
    expect(second.adopt).not.toHaveBeenCalled();
    expect(adopted).toBeUndefined();

    const chat = fakeChat();
    boot.doResolve(chat);
    await settle();
    expect(second.adopt).toHaveBeenCalledWith(chat);
    expect(adopted).toBe(chat);
    expect(second.boot).not.toHaveBeenCalled();
  });

  it('O11: a claim during shutdown boots only after shutdown finishes', async () => {
    const registry = createChatRegistry<FakeChat>();
    const shutdown = resolvablePromise<void>();
    const firstClaim = registry.claim(
      'support',
      options({ boot: () => Promise.resolve(fakeChat(() => shutdown)) })
    );
    const first = await firstClaim.chat;
    firstClaim.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    expect(first.shutdown).toHaveBeenCalledTimes(1);

    const second = options();
    const secondClaim = registry.claim('support', second);
    // Taken already: a third claim collides while the second waits.
    expect(() => registry.claim('support', options())).toThrow(
      /already running/
    );
    await settle();
    expect(second.boot).not.toHaveBeenCalled();

    shutdown.doResolve();
    const chat = await secondClaim.chat;
    expect(second.boot).toHaveBeenCalledTimes(1);
    expect(chat).not.toBe(first);
  });

  it('a failed boot rejects every waiting claim, and the next claim boots fresh', async () => {
    const registry = createChatRegistry<FakeChat>();
    const boot: ResolvablePromise<FakeChat> = resolvablePromise<FakeChat>();
    const firstClaim = registry.claim('support', options({ boot: () => boot }));
    firstClaim.release();
    const secondClaim = registry.claim('support', options());
    const error = new Error('boot failed');
    boot.doReject(error);

    await expect(firstClaim.chat).rejects.toBe(error);
    await expect(secondClaim.chat).rejects.toBe(error);
    const third = options();
    await expect(registry.claim('support', third).chat).resolves.toEqual(
      expect.objectContaining({ shutdown: expect.any(Function) })
    );
    expect(third.boot).toHaveBeenCalledTimes(1);
  });

  it('a failed boot that already expired leaves nothing to shut down', async () => {
    const registry = createChatRegistry<FakeChat>();
    const boot = resolvablePromise<FakeChat>();
    const claim = registry.claim('support', options({ boot: () => boot }));
    claim.release();
    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    boot.doReject(new Error('boot failed'));
    await expect(claim.chat).rejects.toThrow('boot failed');

    const next = options();
    await registry.claim('support', next).chat;
    expect(next.boot).toHaveBeenCalledTimes(1);
  });

  it('a failed adoption drops its claim and opens the window again', async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim('support', options());
    const chat = await firstClaim.chat;
    firstClaim.release();
    const error = new Error('adopt failed');
    const failed = registry.claim(
      'support',
      options({ adopt: () => Promise.reject(error) })
    );
    await expect(failed.chat).rejects.toBe(error);

    // Not stuck as claimed: a later claim adopts the same chat.
    await expect(registry.claim('support', options()).chat).resolves.toBe(chat);
  });

  it('a failed adoption left alone shuts the chat down when the window runs out', async () => {
    const registry = createChatRegistry<FakeChat>();
    const firstClaim = registry.claim('support', options());
    const chat = await firstClaim.chat;
    firstClaim.release();
    const failed = registry.claim(
      'support',
      options({ adopt: () => Promise.reject(new Error('adopt failed')) })
    );
    await expect(failed.chat).rejects.toThrow('adopt failed');

    jest.advanceTimersByTime(DEFAULT_RELEASE_GRACE_MS);
    await settle();
    expect(chat.shutdown).toHaveBeenCalledTimes(1);
  });
});
