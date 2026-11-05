/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import type { MessagePresentationPort } from './messaging/presentationPort';
import type { ViewState, ViewType } from '../../types/state/AppState';
import type {
  MainWindowCloseReason,
  MainWindowOpenReason,
  ViewChangeReason,
} from '../../types/events/eventBusTypes';

/**
 * The view work the human-agent service asks for. Each member is a call site
 * that #2706 later turns into a view reaction.
 */
interface HumanAgentPresentationPort {
  /** Moves focus into the chat after an agent chat starts or ends. */
  requestFocus(): void;
}

/** Reasons a view change records on its events. */
interface ViewChangeReasons {
  viewChangeReason: ViewChangeReason;
  mainWindowOpenReason?: MainWindowOpenReason;
  mainWindowCloseReason?: MainWindowCloseReason;
}

/** The view members behind `ChatInstance` and the instance-facing services. */
interface InstanceViewPort {
  /** Changes the main window and launcher state, and fires the view events. */
  changeView(
    newView: ViewType | Partial<ViewState>,
    reason: ViewChangeReasons,
    tryHydrating?: boolean,
    forceViewChange?: boolean
  ): Promise<ViewState>;
}

/**
 * The one connection from conversation code to a mounted view. A view attaches
 * it whole and detaches it whole; with nothing attached, every view call does
 * nothing. The interfaces live here and the implementations live in `chat/`.
 */
interface ViewBindings {
  messaging: MessagePresentationPort;
  humanAgent: HumanAgentPresentationPort;
  instance: InstanceViewPort;
}

/** Holds the attached view's bindings, if any, for late lookup on each call. */
class ViewConnection {
  private bindings: ViewBindings | undefined;
  private listeners = new Set<() => void>();

  get current(): ViewBindings | undefined {
    return this.bindings;
  }

  /**
   * Attaches a view and returns its detach function. A later attach replaces
   * this one, and an old detach then does nothing.
   */
  attach(bindings: ViewBindings): () => void {
    this.set(bindings);
    let attached = true;
    return () => {
      if (attached) {
        attached = false;
        if (this.bindings === bindings) {
          this.set(undefined);
        }
      }
    };
  }

  /** Calls `listener` after each attach or detach. Returns its remover. */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private set(bindings: ViewBindings | undefined) {
    this.bindings = bindings;
    this.listeners.forEach((listener) => listener());
  }
}

export {
  HumanAgentPresentationPort,
  InstanceViewPort,
  ViewBindings,
  ViewChangeReasons,
  ViewConnection,
};
