/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface InlineEntry {
  target?: HTMLElement;
  fallback?: HTMLElement;
  host?: HTMLElement;
}

const entries = new WeakMap<HTMLElement, Map<string, InlineEntry>>();
const projectedOwners = new WeakMap<HTMLElement, HTMLElement>();

export function bindProjectedOwner(host: HTMLElement, owner: HTMLElement) {
  projectedOwners.set(host, owner);
  return () => {
    projectedOwners.delete(host);
  };
}

export function resolveInputNodeOwner(node: Node | null): HTMLElement | null {
  for (let current: Node = node; current; current = current.parentNode) {
    if (current instanceof HTMLElement) {
      const owner = projectedOwners.get(current);
      if (owner) {
        return owner;
      }
    }
    if (current instanceof ShadowRoot) {
      return current.host as HTMLElement;
    }
  }
  return null;
}

function entryFor(owner: HTMLElement, key: string) {
  let slots = entries.get(owner);
  if (!slots) {
    slots = new Map();
    entries.set(owner, slots);
  }
  let entry = slots.get(key);
  if (!entry) {
    entry = {};
    slots.set(key, entry);
  }
  return { slots, entry };
}

export function registerInlineTarget(
  owner: HTMLElement,
  key: string,
  target: HTMLElement,
  fallback: HTMLElement
) {
  const { slots, entry } = entryFor(owner, key);
  entry.target = target;
  entry.fallback = fallback;
  if (entry.host) {
    target.appendChild(entry.host);
    fallback.hidden = true;
  }
  return () => {
    entry.host?.remove();
    delete entry.target;
    delete entry.fallback;
    if (!entry.host) {
      slots.delete(key);
    }
  };
}

export function mountInlineHost(
  owner: HTMLElement,
  key: string,
  host: HTMLElement
) {
  const { slots, entry } = entryFor(owner, key);
  entry.host = host;
  entry.target?.appendChild(host);
  if (entry.fallback) {
    entry.fallback.hidden = true;
  }
  return () => {
    host.remove();
    delete entry.host;
    if (entry.fallback) {
      entry.fallback.hidden = false;
    }
    if (!entry.target) {
      slots.delete(key);
    }
  };
}

export function mountHost(
  chatWrapper: HTMLElement,
  host: HTMLElement,
  slotName: string,
  isInline: boolean
) {
  const mount = new CustomEvent('cds-aichat-markdown-plugin-host-mount', {
    bubbles: true,
    composed: true,
    cancelable: true,
    detail: { kind: 'customRenderer', slotName, element: host, isInline },
  });
  chatWrapper.dispatchEvent(mount);
  if (!mount.defaultPrevented) {
    chatWrapper.appendChild(host);
  }
}

export function unmountHost(
  chatWrapper: HTMLElement,
  host: HTMLElement,
  slotName: string
) {
  chatWrapper.dispatchEvent(
    new CustomEvent('cds-aichat-markdown-plugin-host-unmount', {
      bubbles: true,
      composed: true,
      detail: { slotName },
    })
  );
  host.remove();
}
