/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { ReactNode, useLayoutEffect } from 'react';
import ReactDOM from 'react-dom';

import { isElement } from '../../utils/domUtils';

/**
 * Renders one render-prop result into its slot host. React content goes
 * through a portal. A web-component host's callback returns a DOM element
 * instead; that element goes into the host as is, and stays put while the
 * callback keeps returning it, so it is never detached and re-attached.
 */
function SlotHostPortal({
  hostElement,
  children,
}: {
  hostElement: HTMLElement;
  children: ReactNode | HTMLElement;
}) {
  const element = isElement(children as Node)
    ? (children as HTMLElement)
    : null;

  useLayoutEffect(() => {
    if (!element) {
      return undefined;
    }
    if (element.parentNode !== hostElement) {
      hostElement.appendChild(element);
    }
    return () => {
      if (element.parentNode === hostElement) {
        element.remove();
      }
    };
  }, [hostElement, element]);

  return element
    ? null
    : ReactDOM.createPortal(children as ReactNode, hostElement);
}

export { SlotHostPortal };
