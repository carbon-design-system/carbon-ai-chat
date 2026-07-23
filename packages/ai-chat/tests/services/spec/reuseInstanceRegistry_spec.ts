/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from "../../../src/chat/services/ServiceManager";
import {
  DEFAULT_REUSE_GRACE_MS,
  acquireServiceManager,
  evictServiceManager,
  peekReuseEntry,
  registerServiceManager,
  releaseServiceManager,
  __resetReuseInstanceRegistry,
} from "../../../src/chat/services/reuseInstanceRegistry";

/** A distinct throwaway object standing in for a real ServiceManager (identity is all we test). */
const makeSM = () => ({}) as unknown as ServiceManager;

describe("reuseInstanceRegistry", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.useFakeTimers();
    __resetReuseInstanceRegistry();
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    __resetReuseInstanceRegistry();
    errorSpy.mockRestore();
    jest.useRealTimers();
  });

  it("returns undefined from acquire when nothing is registered", () => {
    expect(acquireServiceManager("missing")).toBeUndefined();
  });

  it("reuses the same manager on a remount (register -> release -> acquire)", () => {
    const manager = makeSM();
    registerServiceManager("ns", manager, jest.fn());
    releaseServiceManager("ns", manager, DEFAULT_REUSE_GRACE_MS, jest.fn());

    expect(acquireServiceManager("ns")).toBe(manager);
    // A normal remount (release then acquire) is not a concurrency conflict.
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("disposes and evicts after the grace window once the ref-count hits zero", () => {
    const manager = makeSM();
    const dispose = jest.fn();
    registerServiceManager("ns", manager, jest.fn());
    releaseServiceManager("ns", manager, DEFAULT_REUSE_GRACE_MS, dispose);

    expect(dispose).not.toHaveBeenCalled();
    jest.advanceTimersByTime(DEFAULT_REUSE_GRACE_MS);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith(manager);
    expect(peekReuseEntry("ns")).toBeUndefined();
  });

  it("cancels pending disposal when a remount acquires within the grace window", () => {
    const manager = makeSM();
    const dispose = jest.fn();
    registerServiceManager("ns", manager, jest.fn());
    releaseServiceManager("ns", manager, DEFAULT_REUSE_GRACE_MS, dispose);

    expect(acquireServiceManager("ns")).toBe(manager);
    jest.advanceTimersByTime(DEFAULT_REUSE_GRACE_MS * 2);
    expect(dispose).not.toHaveBeenCalled();
  });

  it("evicts and disposes immediately, skipping the grace window", () => {
    const manager = makeSM();
    const dispose = jest.fn();
    registerServiceManager("ns", manager, jest.fn());

    evictServiceManager("ns", manager, dispose);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith(manager);
    expect(peekReuseEntry("ns")).toBeUndefined();
  });

  it("keys on namespace, treating undefined as the empty string", () => {
    const a = makeSM();
    const b = makeSM();
    registerServiceManager("a", a, jest.fn());
    registerServiceManager(undefined, b, jest.fn());

    expect(peekReuseEntry("a")?.serviceManager).toBe(a);
    expect(peekReuseEntry("")?.serviceManager).toBe(b);
    expect(peekReuseEntry(undefined)?.serviceManager).toBe(b);
  });

  it("logs a dev error when a second live mount acquires the same namespace", () => {
    registerServiceManager("ns", makeSM(), jest.fn()); // ref-count 1, still held
    acquireServiceManager("ns"); // ref-count 2 -> concurrent, unsupported
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("disposes a released incumbent when a new manager registers over it", () => {
    const incumbent = makeSM();
    const dispose = jest.fn();
    registerServiceManager("ns", incumbent, jest.fn());
    releaseServiceManager("ns", incumbent, DEFAULT_REUSE_GRACE_MS, dispose);

    const replacement = makeSM();
    registerServiceManager("ns", replacement, dispose);

    // The incumbent's pending grace disposal is replaced by an immediate one.
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith(incumbent);
    expect(peekReuseEntry("ns")?.serviceManager).toBe(replacement);
    jest.advanceTimersByTime(DEFAULT_REUSE_GRACE_MS * 2);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it("leaves a still-held incumbent to dispose itself when registered over", () => {
    const incumbent = makeSM();
    const registerDispose = jest.fn();
    registerServiceManager("ns", incumbent, registerDispose);

    // Overlapping cold boot registers before the incumbent's release runs.
    const replacement = makeSM();
    registerServiceManager("ns", replacement, registerDispose);
    expect(registerDispose).not.toHaveBeenCalled();

    // The displaced incumbent's own release falls back to direct disposal without
    // touching the replacement's entry or ref-count.
    const releaseDispose = jest.fn();
    releaseServiceManager(
      "ns",
      incumbent,
      DEFAULT_REUSE_GRACE_MS,
      releaseDispose,
    );
    expect(releaseDispose).toHaveBeenCalledTimes(1);
    expect(releaseDispose).toHaveBeenCalledWith(incumbent);
    expect(peekReuseEntry("ns")?.serviceManager).toBe(replacement);
    expect(peekReuseEntry("ns")?.refCount).toBe(1);
  });

  it("disposes a displaced manager on evict without evicting the registered one", () => {
    const incumbent = makeSM();
    registerServiceManager("ns", incumbent, jest.fn());
    const replacement = makeSM();
    registerServiceManager("ns", replacement, jest.fn());

    const dispose = jest.fn();
    evictServiceManager("ns", incumbent, dispose);
    expect(dispose).toHaveBeenCalledTimes(1);
    expect(dispose).toHaveBeenCalledWith(incumbent);
    expect(peekReuseEntry("ns")?.serviceManager).toBe(replacement);
  });
});
