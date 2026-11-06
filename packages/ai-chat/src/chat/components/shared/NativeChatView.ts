/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ContextConsumer } from '@lit/context';
import { LitElement, nothing } from 'lit';
import type { AppState } from '../../../types/state/AppState';
import type { ServiceManager } from '../../services/ServiceManager';
import type {
  ChatViewState,
  ChatViewStateSnapshot,
} from '../../services/chatViewState';
import { chatViewStateContext } from '../../../web-components/shared/chat-view-state-context';
import { consoleError, createDidCatchErrorData } from '../../utils/miscUtils';
import { subscribeToSelectedValue } from '../../utils/selectedSubscription';

abstract class NativeChatView extends LitElement {
  protected viewState?: ChatViewState;
  private generation = 0;
  private failed = false;
  private releases: (() => void)[] = [];
  private context = new ContextConsumer(this, {
    context: chatViewStateContext,
    subscribe: true,
    callback: (viewState) => this.bindView(viewState),
  });

  protected get serviceManager(): ServiceManager | undefined {
    return this.viewState?.serviceManager;
  }

  protected createRenderRoot() {
    return this;
  }

  connectedCallback() {
    super.connectedCallback();
    this.bindView(this.context.value);
  }

  disconnectedCallback() {
    this.releaseView();
    super.disconnectedCallback();
  }

  protected abstract onViewConnected(viewState: ChatViewState): void;

  protected abstract renderView(): unknown;

  protected render() {
    return this.viewState && !this.failed ? this.renderView() : nothing;
  }

  protected performUpdate() {
    const viewState = this.viewState;
    const generation = this.generation;
    try {
      super.performUpdate();
    } catch (error) {
      this.reportError(error, viewState, generation);
    }
  }

  protected own(release: () => void): void {
    if (this.viewState && !this.failed && this.isConnected) {
      this.releases.push(release);
    } else {
      release();
    }
  }

  protected captureErrorReporter(): (error: unknown) => void {
    const viewState = this.viewState;
    const generation = this.generation;
    return (error) => this.reportError(error, viewState, generation);
  }

  protected selectStore<Value>(
    selector: (state: AppState) => Value,
    onChange: (value: Value) => void,
    isEqual: (left: Value, right: Value) => boolean = Object.is
  ): void {
    const store = this.serviceManager?.store;
    if (store) {
      this.select(
        { getSnapshot: store.getState, subscribe: store.subscribe },
        selector,
        onChange,
        isEqual
      );
    }
  }

  protected selectView<Value>(
    selector: (state: ChatViewStateSnapshot) => Value,
    onChange: (value: Value) => void,
    isEqual: (left: Value, right: Value) => boolean = Object.is
  ): void {
    if (this.viewState) {
      this.select(this.viewState, selector, onChange, isEqual);
    }
  }

  private select<Snapshot, Value>(
    source: {
      getSnapshot(): Snapshot;
      subscribe(listener: () => void): () => void;
    },
    selector: (state: Snapshot) => Value,
    onChange: (value: Value) => void,
    isEqual: (left: Value, right: Value) => boolean
  ): void {
    const viewState = this.viewState;
    const generation = this.generation;
    const release = subscribeToSelectedValue(
      source,
      selector,
      (value) => {
        if (this.isCurrent(viewState, generation) && !this.failed) {
          onChange(value);
          if (this.isCurrent(viewState, generation) && !this.failed) {
            this.requestUpdate();
          }
        }
      },
      {
        isEqual,
        onError: (error) => this.reportError(error, viewState, generation),
      }
    );
    if (this.isCurrent(viewState, generation)) {
      this.own(release);
    } else {
      release();
    }
  }

  private bindView(viewState: ChatViewState | undefined): void {
    if (this.viewState === viewState) {
      return;
    }
    this.releaseView();
    if (viewState && this.isConnected) {
      this.viewState = viewState;
      this.failed = false;
      const generation = this.generation;
      try {
        this.onViewConnected(viewState);
      } catch (error) {
        this.reportError(error, viewState, generation);
      }
    }
    this.requestUpdate();
  }

  private isCurrent(viewState: ChatViewState, generation: number): boolean {
    return (
      this.isConnected &&
      this.viewState === viewState &&
      this.generation === generation
    );
  }

  private releaseOwned(): void {
    this.releases
      .splice(0)
      .reverse()
      .forEach((release) => release());
  }

  private releaseView(): void {
    this.generation += 1;
    this.viewState = undefined;
    this.releaseOwned();
  }

  private reportError(
    error: unknown,
    viewState: ChatViewState,
    generation: number
  ): void {
    if (!viewState || !this.isCurrent(viewState, generation) || this.failed) {
      return;
    }
    this.failed = true;
    this.releaseOwned();
    this.requestUpdate();
    try {
      viewState.serviceManager.actions.errorOccurred(
        createDidCatchErrorData(
          this.localName,
          error as Error,
          { componentStack: this.localName },
          true
        )
      );
    } catch (reportError) {
      consoleError(
        'The chat could not show its error view, so it left that view empty.',
        reportError
      );
    }
  }
}

export { NativeChatView };
