/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import '../../cds-aichat-container';
import '../../cds-aichat-custom-element';

describe.each(['cds-aichat-container', 'cds-aichat-custom-element'])(
  '%s flattened PublicConfig surface',
  (tagName) => {
    it('converts the ai-enabled attribute via the shared converter', () => {
      const element = document.createElement(tagName) as any;
      element.setAttribute('ai-enabled', 'off');
      expect(element.aiEnabled).toBe(false);
      element.setAttribute('ai-enabled', 'true');
      expect(element.aiEnabled).toBe(true);
      // A removed attribute resolves back to undefined so config defaults apply.
      element.removeAttribute('ai-enabled');
      expect(element.aiEnabled).toBeUndefined();
    });
  }
);
