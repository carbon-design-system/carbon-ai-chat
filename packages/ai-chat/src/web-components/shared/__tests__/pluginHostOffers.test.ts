/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * `isChatContentOffer` decides, for both chat web components, whether a
 * plugin-host offer comes from the chat's own content. Both surfaces pass it
 * as `ownsOffer` and as `shouldDefer`, the second for an older components
 * controller that ignores `ownsOffer`. The parity spec runs against the
 * current controller, so it never reaches that second path; this spec pins
 * the decision itself, using the same element nesting the surfaces render.
 */

import { isChatContentOffer } from '../pluginHostOffers';

/** Records what `isChatContentOffer` says when an offer reaches `listener`. */
function decisionAt(
  listener: HTMLElement,
  container: () => Element | null,
  dispatcher: Node
) {
  let decision: boolean | undefined;
  const onMount = (event: Event) => {
    decision = isChatContentOffer(event, listener, container());
  };
  listener.addEventListener('cds-aichat-markdown-plugin-host-mount', onMount);
  dispatcher.dispatchEvent(
    new CustomEvent('cds-aichat-markdown-plugin-host-mount', {
      bubbles: true,
      composed: true,
      cancelable: true,
    })
  );
  listener.removeEventListener(
    'cds-aichat-markdown-plugin-host-mount',
    onMount
  );
  return decision;
}

/** An element with an open shadow root, standing in for a chat surface. */
function withShadow(tag: string) {
  const element = document.createElement(tag);
  element
    .attachShadow({ mode: 'open' })
    .appendChild(document.createElement('slot'));
  return element;
}

afterEach(() => {
  document.body.replaceChildren();
});

describe('isChatContentOffer', () => {
  describe('cds-aichat-container, or the React ChatContainer', () => {
    let container: HTMLElement;

    beforeEach(() => {
      container = withShadow('x-container');
      document.body.appendChild(container);
    });

    it('accepts an offer dispatched on the container itself', () => {
      expect(decisionAt(container, () => container, container)).toBe(true);
    });

    it('accepts an offer from deep inside the container shadow root', () => {
      const message = withShadow('x-message');
      container.shadowRoot.appendChild(message);
      const markdown = document.createElement('div');
      message.shadowRoot.appendChild(markdown);

      expect(decisionAt(container, () => container, markdown)).toBe(true);
    });

    it('declines an offer from a user-defined response in its light DOM', () => {
      const response = document.createElement('div');
      container.appendChild(response);
      const markdown = document.createElement('div');
      response.appendChild(markdown);

      expect(decisionAt(container, () => container, markdown)).toBe(false);
    });

    it("declines an offer from a host app component's shadow root in its light DOM", () => {
      const appComponent = withShadow('x-app-card');
      container.appendChild(appComponent);
      const markdown = document.createElement('div');
      appComponent.shadowRoot.appendChild(markdown);

      expect(decisionAt(container, () => container, markdown)).toBe(false);
    });
  });

  describe('cds-aichat-custom-element', () => {
    let customElement: HTMLElement;
    let inner: HTMLElement;
    const innerContainer = () =>
      customElement.shadowRoot.querySelector('x-container');

    beforeEach(() => {
      customElement = withShadow('x-custom-element');
      inner = withShadow('x-container');
      customElement.shadowRoot.appendChild(inner);
      document.body.appendChild(customElement);
    });

    it("accepts an offer from the inner container's shadow root", () => {
      const markdown = document.createElement('div');
      inner.shadowRoot.appendChild(markdown);

      expect(decisionAt(customElement, innerContainer, markdown)).toBe(true);
    });

    it('accepts an offer dispatched on the inner container', () => {
      expect(decisionAt(customElement, innerContainer, inner)).toBe(true);
    });

    it("declines an offer from the inner container's light DOM, where renderUserDefinedResponse puts responses", () => {
      const response = document.createElement('div');
      inner.appendChild(response);
      const markdown = document.createElement('div');
      response.appendChild(markdown);

      expect(decisionAt(customElement, innerContainer, markdown)).toBe(false);
    });

    it('declines an offer from its own light DOM', () => {
      const response = document.createElement('div');
      customElement.appendChild(response);
      const markdown = document.createElement('div');
      response.appendChild(markdown);

      expect(decisionAt(customElement, innerContainer, markdown)).toBe(false);
    });

    it('accepts an offer dispatched on the custom element itself', () => {
      expect(decisionAt(customElement, innerContainer, customElement)).toBe(
        true
      );
    });

    it('declines everything before the inner container renders', () => {
      inner.remove();
      const markdown = document.createElement('div');
      customElement.appendChild(markdown);

      expect(decisionAt(customElement, innerContainer, markdown)).toBe(false);
    });
  });
});
