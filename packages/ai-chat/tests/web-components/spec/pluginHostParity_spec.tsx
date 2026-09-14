/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Three-container parity for the plugin-host protocol.
 *
 * `<cds-aichat-markdown>` offers plugin-fallback and custom-renderer hosts to
 * an ancestor chat container over three composed events. The container half is
 * implemented once per surface — React `ChatContainer`, `cds-aichat-container`
 * and `cds-aichat-custom-element` — and nothing has ever checked that the three
 * agree. This spec drives all three with one identical event sequence and
 * compares the resulting host DOM.
 *
 * The events are synthesized rather than produced by a real markdown element:
 * jsdom never upgrades `<cds-aichat-markdown>`, and the subject under test is
 * the listener, not the dispatcher. The details below are the ones
 * `reconcileCustomRendererHosts` actually dispatches — see
 * `packages/ai-chat-components/src/components/markdown/src/markdown.ts`.
 */

import type {
  MarkdownPluginHostMountDetail,
  MarkdownPluginHostMountDetailInput,
} from '@carbon/ai-chat-components/es/components/markdown/index.js';
import { waitFor } from '@testing-library/react';
import React from 'react';
import { createRoot } from 'react-dom/client';

import '../../../src/web-components/cds-aichat-container';
import '../../../src/web-components/cds-aichat-custom-element';
import { ChatContainer } from '../../../src/react/ChatContainer';
import { createBaseConfig, createBaseTestProps } from '../../test_helpers';

// `cds-aichat-custom-element` spreads `root.adoptedStyleSheets` in its
// `createRenderRoot` to append its hide-sheet, and jsdom's ShadowRoot has no
// such property, so connecting it throws before any listener is wired. Same
// class of environment gap as the `CSSStyleSheet` stub in `tests/setup.ts`,
// kept local because this is the first spec to connect that element.
const adopted = new WeakMap<ShadowRoot, unknown[]>();
if (!('adoptedStyleSheets' in ShadowRoot.prototype)) {
  Object.defineProperty(ShadowRoot.prototype, 'adoptedStyleSheets', {
    configurable: true,
    get(this: ShadowRoot) {
      return adopted.get(this) ?? [];
    },
    set(this: ShadowRoot, sheets: unknown[]) {
      adopted.set(this, sheets);
    },
  });
}

const MOUNT = 'cds-aichat-markdown-plugin-host-mount';
const UPDATE = 'cds-aichat-markdown-plugin-host-update';
const UNMOUNT = 'cds-aichat-markdown-plugin-host-unmount';

/**
 * Dispatches a mount offer the way the markdown element does. Typed against
 * the union the components package publishes, so a detail that drifts from the
 * shipped shape is a compile error rather than a passing test.
 */
function mountEvent(detail: MarkdownPluginHostMountDetailInput) {
  return new CustomEvent(MOUNT, {
    bubbles: true,
    composed: true,
    cancelable: true,
    detail,
  });
}

/** The kinded details every non-legacy case below is built from. */
function fallbackDetail(
  slotName: string,
  html: string,
  isInline: boolean
): MarkdownPluginHostMountDetail {
  return { kind: 'pluginFallback', slotName, html, isInline };
}

function rendererDetail(
  slotName: string,
  element: HTMLElement
): MarkdownPluginHostMountDetail {
  return { kind: 'customRenderer', slotName, element, isInline: false };
}

function plainEvent(type: string, detail: Record<string, unknown>) {
  return new CustomEvent(type, { bubbles: true, composed: true, detail });
}

/**
 * One container surface, reduced to what the protocol needs: the element that
 * both listens and receives hosts, plus the element to dispatch from (the same
 * node except where a nested topology is under test).
 */
interface Subject {
  name: string;
  /** Listener target and host parent. */
  host: HTMLElement;
  /** Node the markdown element would have dispatched from. */
  source: HTMLElement;
  /** Awaits a render pass, where the surface has one. */
  settle: () => Promise<void>;
}

const subjects: Subject[] = [];
let containerElement: HTMLElement;
let customElement: HTMLElement;

/** Boots every surface once — each boot is seconds, not milliseconds. */
beforeAll(async () => {
  containerElement = document.createElement('cds-aichat-container');
  (containerElement as unknown as { config: unknown }).config =
    createBaseConfig();
  document.body.appendChild(containerElement);

  customElement = document.createElement('cds-aichat-custom-element');
  (customElement as unknown as { config: unknown }).config = createBaseConfig();
  document.body.appendChild(customElement);

  // A plain root rather than `@testing-library/react`'s `render`: its automatic
  // cleanup unmounts between cases, and unmounting tears down the very effect
  // that owns the listeners under test. Every surface here is booted once.
  const reactMount = document.createElement('div');
  document.body.appendChild(reactMount);
  createRoot(reactMount).render(
    React.createElement(ChatContainer, createBaseTestProps() as never)
  );

  let reactWrapper: HTMLElement | undefined;
  // Wait for the listeners themselves, not for the element: they are attached
  // by an effect keyed on the wrapper, which is set only after the shadow-ready
  // handshake resolves. A probe offer is the only thing that proves they exist.
  await waitFor(
    () => {
      const found = reactMount.querySelector<HTMLElement>('cds-aichat-react');
      expect(found).not.toBeNull();
      const probe = mountEvent(fallbackDetail('boot-probe', '', false));
      found?.dispatchEvent(probe);
      expect(probe.defaultPrevented).toBe(true);
      reactWrapper = found ?? undefined;
    },
    { timeout: 8000 }
  );
  if (!reactWrapper) {
    throw new Error('ChatContainer never produced a cds-aichat-react wrapper');
  }
  const wrapper = reactWrapper;
  wrapper.dispatchEvent(plainEvent(UNMOUNT, { slotName: 'boot-probe' }));

  subjects.push(
    {
      name: 'ChatContainer',
      host: wrapper,
      source: wrapper,
      settle: async () => undefined,
    },
    {
      name: 'cds-aichat-container',
      host: containerElement,
      source: containerElement,
      settle: async () => {
        await (containerElement as unknown as { updateComplete: Promise<void> })
          .updateComplete;
      },
    },
    {
      name: 'cds-aichat-custom-element',
      host: customElement,
      source: customElement,
      settle: async () => {
        await (customElement as unknown as { updateComplete: Promise<void> })
          .updateComplete;
      },
    }
  );
}, 30000);

/**
 * Runs `probe` against every surface and keys the results by name, so a single
 * assertion covers all three. An `expect` inside the loop instead would abort
 * at the first failing surface and leave the others unmeasured — which is the
 * comparison this spec exists to make.
 */
async function acrossSubjects<T>(
  probe: (subject: Subject) => Promise<T>
): Promise<Record<string, T>> {
  const results: Record<string, T> = {};
  for (const subject of subjects) {
    results[subject.name] = await probe(subject);
  }
  return results;
}

/** Builds the expectation every surface has to match. */
function sameForAll<T>(value: (subject: Subject) => T): Record<string, T> {
  return Object.fromEntries(subjects.map((s) => [s.name, value(s)]));
}

/** Slot names a surface forwards inward, or null where it forwards none. */
function forwardedNames(subject: Subject): string[] | null {
  return (
    (subject.host as unknown as { _pluginSlotNames?: string[] })
      ._pluginSlotNames ?? null
  );
}

/** The host a container appended for `slotName`, if it appended one. */
function hostFor(subject: Subject, slotName: string) {
  // `:not(slot)` because a nested container's own forwarders are
  // `<slot name=X slot=X>` light-DOM children carrying the same attribute.
  return subject.host.querySelector<HTMLElement>(
    `[slot="${slotName}"]:not(slot)`
  );
}

describe('plugin-host protocol: all three containers agree', () => {
  it.each([
    ['block', false, 'DIV', '1rem'],
    ['inline', true, 'SPAN', ''],
  ])(
    'hosts a %s plugin-fallback mount identically',
    async (label, isInline, tagName, spacing) => {
      const results = await acrossSubjects(async (subject) => {
        const slotName = `parity-fallback-${label}-${subject.name}`;
        const event = mountEvent(
          fallbackDetail(slotName, '<i>x</i>', isInline)
        );
        subject.source.dispatchEvent(event);
        await subject.settle();
        const host = hostFor(subject, slotName);
        return {
          claimed: event.defaultPrevented,
          tagName: host?.tagName,
          slot: host?.getAttribute('slot'),
          spacing: host?.style.marginBlockStart,
          html: host?.innerHTML,
        };
      });

      expect(results).toEqual(
        sameForAll((subject) => ({
          claimed: true,
          tagName,
          slot: `parity-fallback-${label}-${subject.name}`,
          spacing,
          html: '<i>x</i>',
        }))
      );
    }
  );

  it('relocates a custom-renderer mount identically', async () => {
    const results = await acrossSubjects(async (subject) => {
      const slotName = `parity-renderer-${subject.name}`;
      const live = document.createElement('div');
      const event = mountEvent(rendererDetail(slotName, live));
      subject.source.dispatchEvent(event);
      await subject.settle();
      const host = hostFor(subject, slotName);
      return {
        claimed: event.defaultPrevented,
        sameNode: host === live,
        slot: host?.getAttribute('slot'),
        spacing: host?.style.marginBlockStart,
      };
    });

    expect(results).toEqual(
      sameForAll((subject) => ({
        claimed: true,
        sameNode: true,
        slot: `parity-renderer-${subject.name}`,
        spacing: '',
      }))
    );
  });

  it('rewrites host content in place on update', async () => {
    const results = await acrossSubjects(async (subject) => {
      const slotName = `parity-update-${subject.name}`;
      subject.source.dispatchEvent(
        mountEvent(fallbackDetail(slotName, '<i>one</i>', false))
      );
      await subject.settle();
      const host = hostFor(subject, slotName);

      subject.source.dispatchEvent(
        plainEvent(UPDATE, { slotName, html: '<i>two</i>' })
      );
      await subject.settle();

      return {
        sameNode: hostFor(subject, slotName) === host,
        html: host?.innerHTML,
      };
    });

    expect(results).toEqual(
      sameForAll(() => ({ sameNode: true, html: '<i>two</i>' }))
    );
  });

  it('removes the host and drops the slot name on unmount', async () => {
    const results = await acrossSubjects(async (subject) => {
      const slotName = `parity-unmount-${subject.name}`;
      subject.source.dispatchEvent(
        mountEvent(fallbackDetail(slotName, '<i>x</i>', false))
      );
      await subject.settle();
      const hostedBefore = hostFor(subject, slotName) !== null;
      const forwardedBefore = forwardedNames(subject)?.includes(slotName);

      subject.source.dispatchEvent(plainEvent(UNMOUNT, { slotName }));
      await subject.settle();

      return {
        hostedBefore,
        // `undefined` on a surface that forwards nothing, which is
        // `ChatContainer` — the React `Markdown` wrapper owns its only hop.
        forwardedBefore,
        hostedAfter: hostFor(subject, slotName) !== null,
        forwardedAfter: forwardedNames(subject)?.includes(slotName),
      };
    });

    expect(results).toEqual(
      sameForAll((subject) => ({
        hostedBefore: true,
        forwardedBefore: forwardedNames(subject) === null ? undefined : true,
        hostedAfter: false,
        forwardedAfter: forwardedNames(subject) === null ? undefined : false,
      }))
    );
  });

  it('ignores a mount with no slot name', async () => {
    for (const subject of subjects) {
      const before = subject.host.childElementCount;
      // Deliberately malformed: the union requires `slotName`, so the cast is
      // what lets the case exist at all — and it is exactly the payload the
      // no-op lock says must be ignored.
      const event = mountEvent({
        kind: 'pluginFallback',
        html: '<i>x</i>',
        isInline: false,
      } as unknown as MarkdownPluginHostMountDetailInput);
      subject.source.dispatchEvent(event);
      await subject.settle();

      expect(event.defaultPrevented).toBe(false);
      expect(subject.host.childElementCount).toBe(before);
    }
  });

  /**
   * The components dependency is a caret range, so an older build can still
   * emit the pre-`kind` shape. It has to keep hosting.
   */
  it('hosts a legacy mount detail that carries no kind', async () => {
    for (const subject of subjects) {
      const slotName = `parity-legacy-${subject.name}`;
      subject.source.dispatchEvent(
        mountEvent({ slotName, html: '<i>legacy</i>', isInline: false })
      );
      await subject.settle();

      const host = hostFor(subject, slotName);
      expect(host?.tagName).toBe('DIV');
      expect(host?.innerHTML).toBe('<i>legacy</i>');
    }
  });

  it('relocates a legacy custom-renderer mount that carries no kind', async () => {
    for (const subject of subjects) {
      const slotName = `parity-legacy-renderer-${subject.name}`;
      const live = document.createElement('div');
      const event = mountEvent({ slotName, element: live, isInline: false });
      subject.source.dispatchEvent(event);
      await subject.settle();

      expect(event.defaultPrevented).toBe(true);
      expect(hostFor(subject, slotName)).toBe(live);
    }
  });

  it('does not reattach a custom-renderer host it already holds', async () => {
    for (const subject of subjects) {
      const slotName = `renderer-idempotent-${subject.name}`;
      const live = document.createElement('div');
      subject.source.dispatchEvent(mountEvent(rendererDetail(slotName, live)));
      await subject.settle();

      const marker = document.createElement('span');
      subject.host.appendChild(marker);
      subject.source.dispatchEvent(mountEvent(rendererDetail(slotName, live)));
      await subject.settle();

      // A re-`appendChild` moves `live` past the marker — and detaching and
      // reattaching runs the consumer subtree's disconnect/connect teardown.
      expect(live.nextElementSibling).toBe(marker);
      marker.remove();
    }
  });

  it('ignores an update aimed at a relocated custom-renderer host', async () => {
    for (const subject of subjects) {
      const slotName = `renderer-update-${subject.name}`;
      const live = document.createElement('div');
      live.innerHTML = '<b>consumer</b>';
      subject.source.dispatchEvent(mountEvent(rendererDetail(slotName, live)));
      await subject.settle();

      subject.source.dispatchEvent(
        plainEvent(UPDATE, { slotName, html: '<i>clobbered</i>' })
      );
      await subject.settle();

      expect(live.innerHTML).toBe('<b>consumer</b>');
    }
  });

  it('drops a custom-renderer slot name on unmount but leaves the node parented', async () => {
    for (const subject of subjects) {
      const slotName = `renderer-unmount-${subject.name}`;
      const live = document.createElement('div');
      subject.source.dispatchEvent(mountEvent(rendererDetail(slotName, live)));
      await subject.settle();

      subject.source.dispatchEvent(plainEvent(UNMOUNT, { slotName }));
      await subject.settle();

      // The markdown element detaches its own node before it announces; a
      // controller that removed it here would destroy what it never created.
      expect(forwardedNames(subject)?.includes(slotName) ?? false).toBe(false);
      expect(live.parentElement).toBe(subject.host);
    }
  });
});

describe('plugin-host protocol: forwarder slot names', () => {
  it('forwards a plugin-fallback slot name', async () => {
    for (const subject of subjects) {
      const slotName = `forward-fallback-${subject.name}`;
      subject.source.dispatchEvent(
        mountEvent({
          kind: 'pluginFallback',
          slotName,
          html: '<i>x</i>',
          isInline: false,
        })
      );
      await subject.settle();

      const names = forwardedNames(subject);
      if (names === null) {
        // ChatContainer renders no forwarder; the React Markdown wrapper
        // supplies the only hop on that topology.
        continue;
      }
      expect(names).toContain(slotName);
    }
  });

  /**
   * A relocated custom-renderer host is one or more shadow boundaries out, so
   * it needs the same forwarder chain a fallback host needs. Both kinds are
   * forwarded here identically; the markdown element mints the innermost hop
   * for either, from the claim.
   */
  it('forwards a custom-renderer slot name', async () => {
    for (const subject of subjects) {
      const slotName = `forward-renderer-${subject.name}`;
      const live = document.createElement('div');
      subject.source.dispatchEvent(mountEvent(rendererDetail(slotName, live)));
      await subject.settle();

      const names = forwardedNames(subject);
      if (names === null) {
        continue;
      }
      expect(names).toContain(slotName);
    }
  });
});

describe('plugin-host protocol: nested topology', () => {
  it('cds-aichat-container declines when an outer chat element is present', async () => {
    const inner = customElement.shadowRoot?.querySelector<HTMLElement>(
      'cds-aichat-container'
    );
    if (!inner) {
      throw new Error('cds-aichat-custom-element rendered no inner container');
    }

    const slotName = 'nested-fallback';
    const event = mountEvent(fallbackDetail(slotName, '<i>x</i>', false));
    inner.dispatchEvent(event);
    await (inner as unknown as { updateComplete: Promise<void> })
      .updateComplete;
    await (customElement as unknown as { updateComplete: Promise<void> })
      .updateComplete;

    // The inner container forwards but does not host; the outer element hosts.
    expect(inner.querySelector(`[slot="${slotName}"]:not(slot)`)).toBeNull();
    expect(
      (inner as unknown as { _pluginSlotNames: string[] })._pluginSlotNames
    ).toContain(slotName);
    expect(
      customElement.querySelector(`[slot="${slotName}"]:not(slot)`)
    ).not.toBeNull();
  });

  it('cds-aichat-container defers a custom-renderer mount to the outer chat element', async () => {
    const inner = customElement.shadowRoot?.querySelector<HTMLElement>(
      'cds-aichat-container'
    );
    if (!inner) {
      throw new Error('cds-aichat-custom-element rendered no inner container');
    }

    const slotName = 'nested-renderer';
    const live = document.createElement('div');
    const event = mountEvent(rendererDetail(slotName, live));
    inner.dispatchEvent(event);
    await (inner as unknown as { updateComplete: Promise<void> })
      .updateComplete;
    await (customElement as unknown as { updateComplete: Promise<void> })
      .updateComplete;

    expect(event.defaultPrevented).toBe(true);
    expect(inner.querySelector(`[slot="${slotName}"]:not(slot)`)).toBeNull();
    expect(
      (inner as unknown as { _pluginSlotNames: string[] })._pluginSlotNames
    ).toContain(slotName);
    expect(customElement.querySelector(`[slot="${slotName}"]:not(slot)`)).toBe(
      live
    );
    expect(live.style.marginBlockStart).toBe('');
  });
});
