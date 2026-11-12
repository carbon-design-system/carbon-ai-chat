/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Holds one running chat per namespace, so a conversation can outlive the
 * mount or handle that started it (ADR-0003).
 *
 * Each mount or create takes a claim on its namespace. Releasing the claim
 * opens a grace window. A claim on the same namespace inside the window adopts
 * the running chat. When the window runs out, the chat shuts down. A namespace
 * holds one live claim at a time, so a second one is an error.
 */

/** How long a released chat waits to be adopted, unless its claim says otherwise. */
const DEFAULT_RELEASE_GRACE_MS = 3000;

/** What the registry needs from a chat. */
interface RegisteredChat {
  /**
   * Stops the chat for good. Must not reject, because a new chat on the same
   * namespace waits for it.
   */
  shutdown(): Promise<void>;

  /**
   * Ends the chat for good, which {@link ChatClaim.end} asks for. Must not
   * reject. A chat without it shuts down instead.
   */
  destroy?(): Promise<void>;
}

/** How one claim gets its chat. */
interface ChatClaimOptions<Chat> {
  /**
   * What sort of chat this claim wants, such as one with an interface or one
   * without. A claim adopts only a chat of its own kind. A chat of another kind
   * in its grace window ends early, and a new one boots after it shuts down.
   * Claims that leave it out share one kind.
   */
  kind?: string;

  /** Starts a new chat. Runs only when the namespace has none to adopt. */
  boot(): Promise<Chat>;

  /**
   * Takes over a running chat, for example by applying this claim's config.
   * Runs only on adoption, after the chat's boot and any earlier adoption
   * finish, and only if this claim is still live by then.
   */
  adopt(chat: Chat): Promise<void>;

  /**
   * The grace window in milliseconds, read when this claim is released, so a
   * config change after the claim still counts. A missing, negative, or
   * non-finite value means {@link DEFAULT_RELEASE_GRACE_MS}.
   */
  releaseGraceMs?(): number | undefined;
}

/** A hold on a namespace's chat. */
interface ChatClaim<Chat> {
  /**
   * Resolves once the chat has booted, or has been adopted. Rejects if either
   * fails; a claim that fails is dropped.
   */
  readonly chat: Promise<Chat>;

  /**
   * Drops this claim, which opens the grace window. Calling it again does
   * nothing.
   */
  release(): void;

  /**
   * Destroys the chat, whoever holds it now, as soon as boot finishes. It doesn't wait for the grace window or a running adoption.
   * Nothing adopts it afterward, and a claim still waiting for it rejects. A
   * new chat on the namespace waits for the shutdown. Does nothing once the
   * chat has shut down or ended.
   */
  end(): void;

  /**
   * Files the chat under another namespace, so a claim there collides with it
   * and one on the old namespace starts a new chat. Does nothing unless this
   * claim is live. It doesn't wait for a chat on the new namespace that is
   * still shutting down; a new chat there waits for both.
   *
   * @throws {@link ChatNamespaceError} If the namespace already has a chat,
   * running or in its grace window.
   */
  move(namespace: string | undefined): void;
}

interface ChatRegistry<Chat extends RegisteredChat> {
  /**
   * Takes a claim on a namespace right away, before boot or a pending shutdown
   * finishes, so a second claim made meanwhile collides with it. A missing
   * namespace is the empty one.
   *
   * Adopts the namespace's chat while it's in its grace window. Otherwise
   * boots a new one, after the last chat on the namespace finishes shutting
   * down.
   *
   * @throws {@link ChatNamespaceError} If another claim on the namespace is
   * live.
   */
  claim(
    namespace: string | undefined,
    options: ChatClaimOptions<Chat>
  ): ChatClaim<Chat>;
}

/** One namespace's running chat. */
interface Entry<Chat> {
  /** The namespace the chat is filed under. {@link ChatClaim.move} changes it. */
  key: string;

  /** The kind of claim that booted it. */
  kind?: string;

  /** The live claim, or `null` while the grace window is open. */
  claim: object | null;

  /** The live claim's grace window reader. */
  releaseGraceMs?: () => number | undefined;

  /** Settles when boot does. */
  booted: Promise<Chat>;

  /**
   * Settles once boot and every adoption so far have settled. Never rejects.
   * Adoptions run one at a time behind it, and shutdown waits for it.
   */
  settled: Promise<void>;

  /** Set while the grace window is open. */
  graceTimer?: ReturnType<typeof setTimeout>;

  /** Set by {@link ChatClaim.end}, so a claim still waiting rejects. */
  ended?: boolean;
}

function ignore(): void {
  // A failure here was already reported to the claim that caused it.
}

/**
 * Thrown when a namespace already has a chat that a claim can't take over. It
 * carries the namespace, so a caller can tell it from other failures.
 */
class ChatNamespaceError extends Error {
  /** The namespace, or `''` for none. */
  readonly namespace: string;

  constructor(message: string, namespace: string) {
    super(message);
    this.name = 'ChatNamespaceError';
    this.namespace = namespace;
  }
}

function collisionError(namespace: string) {
  const which = namespace
    ? `with the namespace "${namespace}"`
    : 'with no namespace';
  return new ChatNamespaceError(
    `A chat ${which} is already running, so this one didn't start. Give each chat its own namespace.`,
    namespace
  );
}

function moveCollisionError(namespace: string) {
  const which = namespace
    ? `with the namespace "${namespace}"`
    : 'with no namespace';
  return new ChatNamespaceError(
    `A chat ${which} is already running, so this chat's config didn't change. Give each chat its own namespace; a config that leaves it out means no namespace.`,
    namespace
  );
}

function endedMessage(namespace: string) {
  const which = namespace
    ? `with the namespace "${namespace}"`
    : 'with no namespace';
  return `A chat ${which} was destroyed while this one waited to reuse it, so no chat started. Start a new one.`;
}

function graceMsOf(entry: Entry<unknown>) {
  let ms: number | undefined;
  try {
    ms = entry.releaseGraceMs?.();
  } catch {
    // A reader that throws gets the default, so the chat still shuts down.
  }
  return typeof ms === 'number' && Number.isFinite(ms) && ms >= 0
    ? ms
    : DEFAULT_RELEASE_GRACE_MS;
}

/**
 * Creates a registry. The chat's lifetime rules live here; how a chat boots,
 * adopts a config, and shuts down are the caller's.
 */
function createChatRegistry<Chat extends RegisteredChat>(): ChatRegistry<Chat> {
  const entries = new Map<string, Entry<Chat>>();
  /** Shutdowns still running, which a new chat on the namespace waits for. */
  const closing = new Map<string, Promise<void>>();

  function isCurrent(entry: Entry<Chat>) {
    return entries.get(entry.key) === entry;
  }

  /**
   * Removes the entry and shuts its chat down once boot and any adoption
   * settle, or destroys an ended chat once boot does.
   */
  function shutDown(entry: Entry<Chat>) {
    const { key } = entry;
    clearTimeout(entry.graceTimer);
    entries.delete(key);
    // A boot that failed has nothing to shut down. `shutdown` must not
    // reject; if it does anyway, the namespace still frees up.
    // An end means now: a running adoption, which may never settle, doesn't
    // hold it up.
    const ready = entry.ended
      ? entry.booted
      : entry.settled.then(() => entry.booted);
    const own = ready
      .then((chat) =>
        entry.ended && chat.destroy ? chat.destroy() : chat.shutdown()
      )
      .catch(ignore);
    // A chat moved onto a namespace that was still shutting down holds that
    // shutdown's place, so the next boot there waits for both.
    const previous = closing.get(key);
    const done = previous ? Promise.all([previous, own]).then(ignore) : own;
    closing.set(key, done);
    void done.then(() => {
      // A newer shutdown may have taken the namespace's place meanwhile.
      if (closing.get(key) === done) {
        closing.delete(key);
      }
    });
  }

  function expire(entry: Entry<Chat>) {
    if (isCurrent(entry) && !entry.claim) {
      shutDown(entry);
    }
  }

  function release(entry: Entry<Chat>, claim: object) {
    // A repeat release, or one after another claim took over, does nothing.
    if (!isCurrent(entry) || entry.claim !== claim) {
      return;
    }
    entry.claim = null;
    entry.graceTimer = setTimeout(() => expire(entry), graceMsOf(entry));
  }

  function end(entry: Entry<Chat>) {
    if (!isCurrent(entry)) {
      return;
    }
    entry.ended = true;
    entry.claim = null;
    shutDown(entry);
  }

  function move(entry: Entry<Chat>, claim: object, namespace?: string) {
    const key = namespace ?? '';
    if (!isCurrent(entry) || entry.claim !== claim || key === entry.key) {
      return;
    }
    if (entries.has(key)) {
      throw moveCollisionError(key);
    }
    entries.delete(entry.key);
    entry.key = key;
    entries.set(key, entry);
  }

  function handOut(entry: Entry<Chat>, claim: object, chat: Promise<Chat>) {
    return {
      // An end while this claim waited leaves it nothing to hold.
      chat: chat.then((ready) => {
        if (entry.ended) {
          throw new Error(endedMessage(entry.key));
        }
        return ready;
      }),
      release: () => release(entry, claim),
      end: () => end(entry),
      move: (namespace: string | undefined) => move(entry, claim, namespace),
    };
  }

  function boot(key: string, options: ChatClaimOptions<Chat>): ChatClaim<Chat> {
    const claim = {};
    const previous = closing.get(key) ?? Promise.resolve();
    const booted = previous.then(() => options.boot());
    const entry: Entry<Chat> = {
      key,
      kind: options.kind,
      claim,
      releaseGraceMs: options.releaseGraceMs,
      booted,
      settled: booted.then(ignore, ignore),
    };
    entries.set(key, entry);
    booted.catch(() => {
      // Nothing to adopt, so the next claim boots a new chat. By now a newer
      // entry may hold the namespace; leave that one alone.
      if (isCurrent(entry)) {
        clearTimeout(entry.graceTimer);
        entries.delete(entry.key);
      }
    });
    return handOut(entry, claim, booted);
  }

  function adopt(
    entry: Entry<Chat>,
    options: ChatClaimOptions<Chat>
  ): ChatClaim<Chat> {
    clearTimeout(entry.graceTimer);
    entry.graceTimer = undefined;
    const claim = {};
    entry.claim = claim;
    entry.releaseGraceMs = options.releaseGraceMs;
    // After the adoption before it, so two configs never apply at once.
    const chat = entry.settled
      .then(() => entry.booted)
      .then(async (booted) => {
        // A claim released before its turn has nobody to apply its config
        // for, and an ended chat takes no config.
        if (entry.claim === claim) {
          await options.adopt(booted);
        }
        return booted;
      });
    entry.settled = chat.then(ignore, ignore);
    // A failed adoption leaves the chat unclaimed, so reopen its window.
    chat.catch(() => release(entry, claim));
    return handOut(entry, claim, chat);
  }

  return {
    claim(namespace, options) {
      const key = namespace ?? '';
      const entry = entries.get(key);
      if (entry?.claim) {
        throw collisionError(key);
      }
      if (entry && entry.kind !== options.kind) {
        // Another kind of chat can't take this one over. It was waiting for
        // nobody this claim could be, so it ends now rather than at expiry.
        shutDown(entry);
        return boot(key, options);
      }
      return entry ? adopt(entry, options) : boot(key, options);
    },
  };
}

export { ChatNamespaceError, createChatRegistry, DEFAULT_RELEASE_GRACE_MS };
export type { ChatClaim };
