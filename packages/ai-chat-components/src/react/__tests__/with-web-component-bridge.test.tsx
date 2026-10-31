/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { act } from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { withWebComponentBridge } from '../utils/withWebComponentBridge';

class BridgeTestElement extends HTMLElement {
  private closeValue?: () => void;
  private toggleValue?: () => void;

  get onClose() {
    return this.closeValue;
  }

  set onClose(value: (() => void) | undefined) {
    this.closeValue = value;
  }

  get onToggle() {
    return this.toggleValue;
  }

  set onToggle(value: (() => void) | undefined) {
    this.toggleValue = value;
  }
}
customElements.define('test-bridge-element', BridgeTestElement);

const Host = React.forwardRef<BridgeTestElement, Record<string, unknown>>(
  function Host(_props, ref) {
    return React.createElement('test-bridge-element', { ref });
  }
);

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  (globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
  container = document.createElement('div');
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

async function mount(
  Component: React.ComponentType<any>,
  props: Record<string, unknown>
) {
  await act(async () => {
    root.render(React.createElement(Component, props));
  });
  return container.querySelector('test-bridge-element') as BridgeTestElement;
}

test('skips every onX prop without options', async () => {
  const onClose = jest.fn();
  const element = await mount(withWebComponentBridge(Host), {
    data: 1,
    onClose,
  });
  expect((element as any).data).toBe(1);
  expect(element.onClose).toBeUndefined();
});

test('assigns declared callback properties when options are given', async () => {
  const onClose = jest.fn();
  const onMissing = jest.fn();
  const element = await mount(withWebComponentBridge(Host, { events: {} }), {
    onClose,
    onMissing,
    onClick: jest.fn(),
  });
  expect(element.onClose).toBe(onClose);
  expect((element as any).onMissing).toBeUndefined();
  expect((element as any).onClick).toBeUndefined();
  expect(element.onclick).toBeNull();
});

test('leaves an events-map key unassigned even when it is a property', async () => {
  const onClose = jest.fn();
  const onToggle = jest.fn();
  const element = await mount(
    withWebComponentBridge(Host, { events: { onToggle: 'test-toggle' } }),
    { onClose, onToggle }
  );
  expect(element.onClose).toBe(onClose);
  expect(element.onToggle).toBeUndefined();
});
