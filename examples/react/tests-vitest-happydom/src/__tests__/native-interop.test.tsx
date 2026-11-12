/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/** Checks native Lit properties and actual callbacks so a Node-only Lit entry cannot pass the DOM harness. */
import React from 'react';
import { act, render } from '@testing-library/react';
import { createComponent, type EventName } from '@lit/react';
import { LitElement, html } from 'lit';
import { expect, test, vi } from 'vitest';

interface ChangeDetail {
  value: string;
}
class NativeInteropElement extends LitElement {
  static properties = {
    value: {},
    record: { attribute: false },
    formatter: { attribute: false },
  };
  declare value: string;
  declare record: { label: string } | undefined;
  declare formatter: ((value: string) => string) | undefined;
  constructor() {
    super();
    this.value = 'initial';
  }
  private activate() {
    this.dispatchEvent(
      new CustomEvent<ChangeDetail>('vitest-native-change', {
        detail: { value: this.value },
        bubbles: true,
        composed: true,
      })
    );
  }
  render() {
    return html`<output>${this.formatter?.(this.record?.label ?? '')}</output
      ><button @click=${this.activate}>Activate</button>`;
  }
}
customElements.define('vitest-native-interop', NativeInteropElement);
const NativeInterop = createComponent({
  tagName: 'vitest-native-interop',
  elementClass: NativeInteropElement,
  react: React,
  events: {
    onChange: 'vitest-native-change' as EventName<CustomEvent<ChangeDetail>>,
    onNativeClick: 'click' as EventName<MouseEvent>,
  },
});

test('native Lit browser effects update properties, listeners, and concrete refs', async () => {
  const firstRecord = { label: 'first' };
  const secondRecord = { label: 'second' };
  const formatter = (value: string) => `rendered ${value}`;
  const first = vi.fn((_event: CustomEvent<ChangeDetail>) => {});
  const second = vi.fn((_event: CustomEvent<ChangeDetail>) => {});
  const native = vi.fn((_event: MouseEvent) => {});
  const ref = React.createRef<NativeInteropElement>();
  const { container, rerender, unmount } = render(
    <NativeInterop
      ref={ref}
      value="first"
      record={firstRecord}
      formatter={formatter}
      onChange={first}
      onNativeClick={native}
    />
  );
  const host = container.querySelector<NativeInteropElement>(
    'vitest-native-interop'
  )!;
  await act(async () => {
    await host.updateComplete;
  });
  expect(ref.current).toBe(host);
  expect(host.value).toBe('first');
  expect(host.record).toBe(firstRecord);
  expect(host.formatter).toBe(formatter);
  expect(host.shadowRoot!.querySelector('output')!.textContent).toBe(
    'rendered first'
  );
  await act(async () => {
    host.shadowRoot!.querySelector('button')!.click();
  });
  expect(first).toHaveBeenCalledTimes(1);
  expect(first.mock.calls[0][0].detail).toEqual({ value: 'first' });
  expect(native).toHaveBeenCalledTimes(1);
  expect(native.mock.calls[0][0]).toBeInstanceOf(MouseEvent);

  rerender(
    <NativeInterop
      ref={ref}
      value="second"
      record={secondRecord}
      formatter={formatter}
      onChange={second}
    />
  );
  await act(async () => {
    await host.updateComplete;
  });
  expect(host.record).toBe(secondRecord);
  expect(host.shadowRoot!.querySelector('output')!.textContent).toBe(
    'rendered second'
  );
  await act(async () => {
    host.shadowRoot!.querySelector('button')!.click();
  });
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  expect(second.mock.calls[0][0].detail).toEqual({ value: 'second' });
  expect(native).toHaveBeenCalledTimes(1);

  rerender(<NativeInterop ref={ref} value="removed" />);
  await act(async () => {
    await host.updateComplete;
  });
  expect(host.record).toBeUndefined();
  expect(host.formatter).toBeUndefined();
  await act(async () => {
    host.shadowRoot!.querySelector('button')!.click();
  });
  expect(first).toHaveBeenCalledTimes(1);
  expect(second).toHaveBeenCalledTimes(1);
  unmount();
  expect(ref.current).toBeNull();
});
