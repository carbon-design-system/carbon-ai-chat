/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from 'react';
import { render } from '@testing-library/react';

import { SlotHostPortal } from '../../../src/chat/components/portals/SlotHostPortal';

describe('SlotHostPortal', () => {
  it('adopts an iframe element and preserves it across renders', () => {
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const element = iframe.contentDocument.createElement('button');
    element.textContent = 'Custom content';
    expect(element).not.toBeInstanceOf(HTMLElement);
    const host = document.createElement('div');

    try {
      const { rerender, unmount } = render(
        <SlotHostPortal hostElement={host}>{element}</SlotHostPortal>
      );
      expect(host.firstChild).toBe(element);
      expect(element.ownerDocument).toBe(document);

      const observer = new MutationObserver(() => undefined);
      observer.observe(host, { childList: true });
      rerender(<SlotHostPortal hostElement={host}>{element}</SlotHostPortal>);
      expect(host.firstChild).toBe(element);
      expect(observer.takeRecords()).toHaveLength(0);
      observer.disconnect();

      rerender(
        <SlotHostPortal hostElement={host}>
          <span>React content</span>
        </SlotHostPortal>
      );
      expect(element.parentNode).toBeNull();
      expect(host.textContent).toBe('React content');

      rerender(<SlotHostPortal hostElement={host}>{element}</SlotHostPortal>);
      expect(host.firstChild).toBe(element);
      unmount();
      expect(host.childNodes).toHaveLength(0);
    } finally {
      iframe.remove();
    }
  });
});
