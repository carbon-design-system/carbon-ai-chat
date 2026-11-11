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
}

/** How one claim gets its chat. */
interface ChatClaimOptions<Chat> {
  /** Starts a new chat. Runs only when the namespace has none to adopt. */
  boot(): Promise<Chat>;

  /**
   * Takes over a running chat, for example by applying this claim's config.
   * Runs only on adoption, after the chat's boot finishes.
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
   * @throws If another claim on the namespace is live.
   */
  claim(
    namespace: string | undefined,
    options: ChatClaimOptions<Chat>
  ): ChatClaim<Chat>;
}

/** One namespace's running chat. */
interface Entry<Chat> {
  /** The live claim, or `null` while the grace window is open. */
  claim: object | null;

  /** The live claim's grace window reader. */
  releaseGraceMs?: () => number | undefined;

  /** Settles when boot does. */
  booted: Promise<Chat>;

  /** Set while the grace window is open. */
  graceTimer?: ReturnType<typeof setTimeout>;
}

function collisionMessage(namespace: string) {
  const which = namespace
    ? `with the namespace "${namespace}"`
    : 'with no namespace';
  return `A chat ${which} is already running, so this one didn't start. Give each chat its own namespace.`;
}

function graceMsOf(entry: Entry<unknown>) {
  const ms = entry.releaseGraceMs?.();
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

  function expire(key: string, entry: Entry<Chat>) {
    if (entries.get(key) !== entry || entry.claim) {
      return;
    }
    entries.delete(key);
    // Waits for boot to settle. A boot that failed has nothing to shut down.
    const done: Promise<void> = entry.booted.then(
      (chat) => chat.shutdown(),
      (): void => undefined
    );
    closing.set(key, done);
    void done.then(() => {
      if (closing.get(key) === done) {
        closing.delete(key);
      }
    });
  }

  function release(key: string, entry: Entry<Chat>, claim: object) {
    // A repeat release, or one after another claim took over, does nothing.
    if (entries.get(key) !== entry || entry.claim !== claim) {
      return;
    }
    entry.claim = null;
    entry.graceTimer = setTimeout(() => expire(key, entry), graceMsOf(entry));
  }

  function boot(key: string, options: ChatClaimOptions<Chat>): ChatClaim<Chat> {
    const claim = {};
    const previous = closing.get(key) ?? Promise.resolve();
    const entry: Entry<Chat> = {
      claim,
      releaseGraceMs: options.releaseGraceMs,
      booted: previous.then(() => options.boot()),
    };
    entries.set(key, entry);
    entry.booted.catch(() => {
      // Nothing to adopt, so the next claim boots a new chat.
      if (entries.get(key) === entry) {
        clearTimeout(entry.graceTimer);
        entries.delete(key);
      }
    });
    return {
      chat: entry.booted,
      release: () => release(key, entry, claim),
    };
  }

  function adopt(
    key: string,
    entry: Entry<Chat>,
    options: ChatClaimOptions<Chat>
  ): ChatClaim<Chat> {
    clearTimeout(entry.graceTimer);
    entry.graceTimer = undefined;
    const claim = {};
    entry.claim = claim;
    entry.releaseGraceMs = options.releaseGraceMs;
    const chat = entry.booted.then(async (booted) => {
      await options.adopt(booted);
      return booted;
    });
    // The caller never gets a chat it could release, so drop the claim here.
    chat.catch(() => release(key, entry, claim));
    return { chat, release: () => release(key, entry, claim) };
  }

  return {
    claim(namespace, options) {
      const key = namespace ?? '';
      const entry = entries.get(key);
      if (entry?.claim) {
        throw new Error(collisionMessage(key));
      }
      return entry ? adopt(key, entry, options) : boot(key, options);
    },
  };
}

export { createChatRegistry, DEFAULT_RELEASE_GRACE_MS };
