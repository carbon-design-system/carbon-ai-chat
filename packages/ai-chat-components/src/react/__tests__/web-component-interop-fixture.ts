/**
 * @license
 * Copyright IBM Corp. 2026
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import React from 'react';
import { createComponent, type EventName } from '@lit/react';
import { LitElement, html } from 'lit';

export interface InteropDetail {
  value: string;
}
export class InteropElement extends LitElement {
  static properties = {
    textValue: { type: String },
    booleanValue: { type: Boolean },
    objectValue: { attribute: false },
    arrayValue: { attribute: false },
    formatter: { attribute: false },
    accepted: { state: true },
  };
  declare textValue: string | undefined;
  declare booleanValue: boolean | undefined;
  declare objectValue: { label: string } | undefined;
  declare arrayValue: string[] | undefined;
  declare formatter: ((value: string) => string) | undefined;
  declare accepted: number;
  constructor() {
    super();
    this.textValue = 'initial';
    this.booleanValue = false;
    this.objectValue = { label: 'initial object' };
    this.arrayValue = [];
    this.formatter = (value) => value;
    this.accepted = 0;
  }
  private activate() {
    const accepted = this.dispatchEvent(
      new CustomEvent<InteropDetail>('caic-interop-change', {
        detail: { value: this.textValue ?? '' },
        bubbles: true,
        composed: true,
        cancelable: true,
      })
    );
    if (accepted) {
      this.accepted += 1;
    }
  }
  render() {
    return html`<output
        >${this.textValue ?? 'removed'}|${String(this.booleanValue)}|${this.objectValue?.label ?? 'removed'}|${this.arrayValue?.join(',') ?? 'removed'}|${this.formatter?.('formatted') ?? 'removed'}</output
      ><button @click=${this.activate}>Activate</button
      ><span>${this.accepted}</span>`;
  }
}
customElements.define('caic-interop-fixture', InteropElement);
export const NativeInterop = createComponent({
  tagName: 'caic-interop-fixture',
  elementClass: InteropElement,
  react: React,
  events: {
    onChange: 'caic-interop-change' as EventName<CustomEvent<InteropDetail>>,
    onNativeClick: 'click' as EventName<MouseEvent>,
  },
});
