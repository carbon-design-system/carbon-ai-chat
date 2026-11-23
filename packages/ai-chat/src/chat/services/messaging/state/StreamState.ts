/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

declare const streamControllerToken: unique symbol;
type StreamControllerToken = { readonly [streamControllerToken]: true };

interface StreamResponseMeta {
  requestId?: string;
  itemIds: Set<string>;
  controllerToken?: StreamControllerToken;
}

/**
 * Tracks streaming response/item IDs and related metadata.
 */
class StreamState {
  private responseToMeta = new Map<string, StreamResponseMeta>();
  private itemToResponse = new Map<string, string>();

  resolveResponseId(id: string) {
    return this.itemToResponse.get(id) ?? id;
  }

  track(
    responseId: string,
    requestId?: string,
    controllerToken?: StreamControllerToken,
    itemId?: string
  ) {
    const existing = this.responseToMeta.get(responseId);
    if (existing) {
      if (requestId && !existing.requestId) {
        existing.requestId = requestId;
      }
      if (controllerToken && !existing.controllerToken) {
        existing.controllerToken = controllerToken;
      }
      if (itemId) {
        existing.itemIds.add(itemId);
        this.itemToResponse.set(itemId, responseId);
      }
      return existing;
    }

    const entry: StreamResponseMeta = {
      requestId,
      controllerToken,
      itemIds: new Set<string>(),
    };

    if (itemId) {
      entry.itemIds.add(itemId);
      this.itemToResponse.set(itemId, responseId);
    }

    this.responseToMeta.set(responseId, entry);
    return entry;
  }

  getMeta(responseId: string) {
    return this.responseToMeta.get(responseId);
  }

  clear(responseId: string) {
    const entry = this.responseToMeta.get(responseId);
    if (entry) {
      entry.itemIds.forEach((itemId) => this.itemToResponse.delete(itemId));
      this.responseToMeta.delete(responseId);
    }
    return entry;
  }
}

export { StreamState };
export type { StreamControllerToken, StreamResponseMeta };
