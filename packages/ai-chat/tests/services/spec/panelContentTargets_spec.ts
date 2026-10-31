/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { EventBus } from '../../../src/chat/events/EventBus';
import { ExtensionHosts } from '../../../src/chat/services/extensionHosts';
import type { ChatInstance } from '../../../src/types/instance/ChatInstance';

function setup() {
  const wrapper = document.createElement('div');
  const root = wrapper.attachShadow({ mode: 'open' });
  document.body.appendChild(wrapper);
  const instance = new EventBus() as unknown as ChatInstance;
  const hosts = new ExtensionHosts(
    instance,
    wrapper,
    {
      getState: () => ({ allMessagesByID: {} }),
      subscribe: () => () => {},
    },
    () => false
  );
  hosts.connect();
  return { wrapper, root, hosts };
}

afterEach(() => {
  document.body.innerHTML = '';
});

it('keeps shadow-side panel targets separate from outer extension hosts', () => {
  const { wrapper, root, hosts } = setup();
  const body = hosts.panelTargetFor('custom-body');
  const title = hosts.panelTargetFor('custom-title');
  expect(body.slot).toBe('body');
  expect(title.slot).toBe('title');
  expect(body.isConnected).toBe(false);
  expect(hosts.panelTargetFor('custom-body')).toBe(body);
  const request = hosts.preparePanelContent('custom', {}, [
    'custom-body',
    'custom-title',
  ]);
  expect(hosts.markPanelContentPlaced(request)).toBe(false);
  wrapper.append(body, title);
  expect(hosts.markPanelContentPlaced(request)).toBe(false);
  root.append(body, title);
  expect(hosts.markPanelContentPlaced(request)).toBe(true);
  expect(hosts.commitPanelContent(request)).toBe(true);
  expect(hosts.isPanelContentCommitted('custom', request.revision)).toBe(true);
  hosts.disconnect();
});

it('retires stale commits while preserving targets for the next content generation', () => {
  const { root, hosts } = setup();
  const first = hosts.preparePanelContent('response', {}, [
    'response-body',
    'response-footer',
  ]);
  root.append(...Object.values(first.targets));
  hosts.markPanelContentPlaced(first);
  hosts.commitPanelContent(first);
  const revision = {};
  const next = hosts.preparePanelContent('response', revision, [
    'response-body',
    'response-footer',
  ]);
  expect(hosts.preparePanelContent('response', revision, next.names)).toBe(
    next
  );
  expect(next.targets['response-body']).toBe(first.targets['response-body']);
  expect(hosts.commitPanelContent(first)).toBe(false);
  expect(hosts.isPanelContentCommitted('response', revision)).toBe(false);
  expect(hosts.commitPanelContent(next)).toBe(false);
  hosts.markPanelContentPlaced(next);
  expect(hosts.commitPanelContent(next)).toBe(true);
  hosts.retirePanelContent('response');
  expect(hosts.commitPanelContent(next)).toBe(false);
  expect(hosts.getPanelContentSnapshot()).toEqual([]);
  hosts.disconnect();
});

it('does not accept another chat owner or disconnected placement', () => {
  const first = setup();
  const other = setup();
  const request = first.hosts.preparePanelContent('iframe', {}, [
    'iframe-body',
  ]);
  other.root.appendChild(request.targets['iframe-body']);
  expect(first.hosts.markPanelContentPlaced(request)).toBe(false);
  expect(other.hosts.commitPanelContent(request)).toBe(false);
  first.root.appendChild(request.targets['iframe-body']);
  first.hosts.markPanelContentPlaced(request);
  first.wrapper.remove();
  expect(first.hosts.commitPanelContent(request)).toBe(false);
  first.hosts.disconnect();
  other.hosts.disconnect();
});

it('keeps pending body targets while a newly requested title waits for placement', () => {
  const { root, hosts } = setup();
  const first = hosts.preparePanelContent('citation', {}, ['citation-body']);
  root.appendChild(first.targets['citation-body']);
  hosts.markPanelContentPlaced(first);
  hosts.commitPanelContent(first);
  const next = hosts.preparePanelContent('citation', {}, [
    'citation-body',
    'citation-title',
  ]);
  expect(hosts.getPanelContentSnapshot()).toEqual([next]);
  expect(next.targets['citation-body']).toBe(first.targets['citation-body']);
  expect(hosts.markPanelContentPlaced(next)).toBe(false);
  expect(hosts.commitPanelContent(next)).toBe(false);
  root.appendChild(next.targets['citation-title']);
  hosts.markPanelContentPlaced(next);
  expect(hosts.commitPanelContent(next)).toBe(true);
  hosts.disconnect();
});

it('drops disconnect acknowledgments without discarding element identity', () => {
  const { root, hosts } = setup();
  const revision = {};
  const request = hosts.preparePanelContent('custom', revision, [
    'custom-body',
  ]);
  root.appendChild(request.targets['custom-body']);
  hosts.markPanelContentPlaced(request);
  hosts.disconnect();
  hosts.connect();
  expect(hosts.commitPanelContent(request)).toBe(false);
  const next = hosts.preparePanelContent('custom', revision, ['custom-body']);
  expect(next.generation).toBeGreaterThan(request.generation);
  expect(next.targets['custom-body']).toBe(request.targets['custom-body']);
  hosts.markPanelContentPlaced(next);
  expect(hosts.commitPanelContent(next)).toBe(true);
  hosts.disconnect();
});
