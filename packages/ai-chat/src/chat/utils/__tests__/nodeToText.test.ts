/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { nodeToText } from '../domUtils';

describe('nodeToText', () => {
  describe('text extraction', () => {
    beforeEach(() => {
      document.body.innerHTML = '';
    });

    afterEach(() => {
      document.body.innerHTML = '';
    });

    it('should skip elements with display:none', () => {
      const div = document.createElement('div');
      div.style.display = 'none';
      div.textContent = 'Hidden content';
      const strings: string[] = [];
      // A detached element has no computed style in a browser, so attach it.
      document.body.append(div);

      nodeToText(div, strings);
      div.remove();

      expect(strings).toEqual([]);
    });

    it('should extract aria-label from elements', () => {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Click me');
      button.textContent = 'Button text';
      const strings: string[] = [];

      nodeToText(button, strings);

      // Buttons are skipped but aria-label should not be extracted for buttons
      expect(strings).toEqual([]);
    });

    it("should skip elements with role='button'", () => {
      const div = document.createElement('div');
      div.setAttribute('role', 'button');
      div.textContent = 'Click me';
      const strings: string[] = [];

      nodeToText(div, strings);

      expect(strings).toEqual([]);
    });

    it('should process slot elements and their assigned nodes', () => {
      // Create a custom element with shadow DOM
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });

      // Create a slot in the shadow DOM
      const slot = document.createElement('slot');
      shadowRoot.appendChild(slot);

      // Create slotted content in the light DOM
      const slottedText = document.createTextNode('Slotted content');
      host.appendChild(slottedText);

      document.body.appendChild(host);

      const strings: string[] = [];
      nodeToText(slot, strings);

      expect(strings).toEqual(['Slotted content']);
    });

    it('should handle elements with data-cds-aichat-exclude-node-read attribute', () => {
      const div = document.createElement('div');
      div.setAttribute('data-cds-aichat-exclude-node-read', '');
      div.textContent = 'Excluded content';

      const strings: string[] = [];
      nodeToText(div, strings);

      expect(strings).toEqual([]);
    });

    it('should extract alt text from images', () => {
      const img = document.createElement('img');
      img.setAttribute('alt', 'Image description');

      const strings: string[] = [];
      nodeToText(img, strings);

      expect(strings).toEqual(['Image description']);
    });

    it('should handle complex shadow DOM structures like markdown component', () => {
      // Simulate the cds-aichat-markdown structure
      const host = document.createElement('div');
      const shadowRoot = host.attachShadow({ mode: 'open' });

      // Create the rendered content div (visible)
      const renderedDiv = document.createElement('div');
      renderedDiv.className = 'cds-aichat-markdown-stack';
      renderedDiv.textContent = 'Rendered markdown content';
      shadowRoot.appendChild(renderedDiv);

      // Create the hidden slot container (should be skipped)
      const hiddenContainer = document.createElement('div');
      hiddenContainer.setAttribute('aria-hidden', 'true');
      hiddenContainer.setAttribute('hidden', '');

      const slot = document.createElement('slot');
      hiddenContainer.appendChild(slot);
      shadowRoot.appendChild(hiddenContainer);

      // Add the original markdown text to light DOM (slotted content)
      const originalText = document.createTextNode('Original markdown text');
      host.appendChild(originalText);

      document.body.appendChild(host);

      // Process the entire host element
      const strings: string[] = [];
      nodeToText(host, strings);

      // Should only get the rendered content, not the slotted content
      expect(strings).toEqual(['Rendered markdown content']);
      expect(strings).not.toContain('Original markdown text');
    });

    it("should skip nested content within aria-hidden='true' element", () => {
      const container = document.createElement('div');

      const visibleText = document.createElement('span');
      visibleText.textContent = 'Visible';
      container.appendChild(visibleText);

      const hiddenSection = document.createElement('div');
      hiddenSection.setAttribute('aria-hidden', 'true');

      const deeplyNested = document.createElement('div');
      const deeperNested = document.createElement('span');
      deeperNested.textContent = 'Deeply nested hidden';
      deeplyNested.appendChild(deeperNested);
      hiddenSection.appendChild(deeplyNested);

      container.appendChild(hiddenSection);

      document.body.appendChild(container);

      const strings: string[] = [];
      nodeToText(container, strings);

      expect(strings).toEqual(['Visible']);
      expect(strings).not.toContain('Deeply nested hidden');
    });
  });
});
