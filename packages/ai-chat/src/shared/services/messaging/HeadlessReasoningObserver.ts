/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { ServiceManager } from '../ServiceManager';
import type { LocalMessageItem } from '../../../types/messaging/LocalMessageItem';
import type { Message } from '../../../types/messaging/Messages';

export class HeadlessReasoningObserver {
  private sessions = new Map<
    string,
    {
      fired: Set<string>;
      message?: Message;
      local?: LocalMessageItem;
    }
  >();
  private disposed = false;
  private unsubscribe: () => void;
  private unsubscribeView: () => void;
  private restartCount: number;
  private reconciledIDs?: readonly string[];

  constructor(
    private manager: ServiceManager,
    private notify: (
      session: Set<string>,
      message: Message,
      isCurrent: () => boolean
    ) => void
  ) {
    this.restartCount = manager.restartCount;
    this.unsubscribe = manager.store.subscribe(this.observe);
    // A view that detaches leaves delivery here; rescan what it didn't fire.
    this.unsubscribeView = manager.view?.subscribe(this.observe) ?? (() => {});
    void Promise.resolve().then(() => {
      if (!this.disposed) {
        this.observe();
      }
    });
  }

  private reconcile() {
    if (this.restartCount !== this.manager.restartCount) {
      this.sessions.clear();
      this.restartCount = this.manager.restartCount;
    }
    const state = this.manager.store.getState();
    // Restart cleanup can publish while the old visible maps are still present.
    if (state.isRestarting) {
      this.sessions.clear();
      return { state, ids: [] as string[] };
    }
    const ids = state.assistantMessageState.localMessageIDs;
    this.reconciledIDs = ids;
    const visible = new Set(ids);
    for (const id of this.sessions.keys()) {
      if (!visible.has(id) || !state.allMessageItemsByID[id]) {
        this.sessions.delete(id);
      }
    }
    for (const id of ids) {
      if (state.allMessageItemsByID[id] && !this.sessions.has(id)) {
        this.sessions.set(id, { fired: new Set() });
      }
    }
    return { state, ids };
  }

  dispose() {
    this.disposed = true;
    this.unsubscribe();
    this.unsubscribeView();
    this.sessions.clear();
  }

  /**
   * The fired set for a visible local item, shared with the mounted view.
   * Returns undefined for an item outside the visible list.
   */
  sessionFor(localItemID: string): Set<string> | undefined {
    if (!this.disposed && !this.sessions.has(localItemID)) {
      this.reconcile();
    }
    return this.sessions.get(localItemID)?.fired;
  }

  observe = () => {
    if (this.disposed) {
      return;
    }
    if (this.manager.view?.current) {
      // The mounted view fires reasoning; keep sessions in step with the list
      // only when it changes, so streaming adds no scan per chunk.
      const state = this.manager.store.getState();
      if (
        this.restartCount !== this.manager.restartCount ||
        state.isRestarting ||
        state.assistantMessageState.localMessageIDs !== this.reconciledIDs
      ) {
        this.reconcile();
      }
      return;
    }
    if (!this.manager.instance) {
      return;
    }
    // Nested commits may retire sessions or create new visible items.
    while (!this.disposed) {
      const { state, ids } = this.reconcile();
      const id = ids.find((candidate) => {
        const session = this.sessions.get(candidate);
        const local = state.allMessageItemsByID[candidate];
        const message = local && state.allMessagesByID[local.fullMessageID];
        return (
          session &&
          message &&
          (session.message !== message || session.local !== local)
        );
      });
      if (id === undefined) {
        return;
      }
      const session = this.sessions.get(id);
      const local = state.allMessageItemsByID[id];
      const message = state.allMessagesByID[local.fullMessageID];
      session.message = message;
      session.local = local;
      this.notify(session.fired, message, () => {
        if (this.disposed) {
          return false;
        }
        const current = this.reconcile().state;
        const currentLocal = current.allMessageItemsByID[id];
        return (
          this.sessions.get(id) === session &&
          currentLocal &&
          current.allMessagesByID[currentLocal.fullMessageID] === message
        );
      });
    }
  };
}
