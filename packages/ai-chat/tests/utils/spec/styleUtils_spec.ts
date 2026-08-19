/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import {
  convertCSSVariablesToString,
  validateCustomProperties,
} from '../../../src/chat/utils/styleUtils';

describe('styleUtils', () => {
  describe('convertCSSVariablesToString', () => {
    it('maps bare keys to --cds-aichat-* shell tokens', () => {
      const css = convertCSSVariablesToString({
        'launcher-color-background': '#1a1a2e',
      });
      expect(css).toContain('--cds-aichat-launcher-color-background:#1a1a2e;');
    });

    it('maps $-prefixed keys to Carbon --cds-* tokens', () => {
      const css = convertCSSVariablesToString({
        '$button-primary': '#1a1a2e',
        '$link-primary': '#abcdef',
      });
      expect(css).toContain('--cds-button-primary:#1a1a2e;');
      expect(css).toContain('--cds-link-primary:#abcdef;');
      // The "$" should be stripped, not emitted as part of the property name.
      expect(css).not.toContain('--cds-$');
    });

    it('targets the theme classes so overrides win under injectCarbonTheme', () => {
      const css = convertCSSVariablesToString({ '$button-primary': '#1a1a2e' });
      // Doubled render class (specificity 0,2,0) beats Carbon's single theme class,
      // and each forced theme class is covered explicitly.
      expect(css).toContain(
        '.cds-aichat--container--render.cds-aichat--container--render'
      );
      expect(css).toContain('.cds-aichat--container--render.cds--g100');
      expect(css).toContain(':host');
    });

    it('returns an empty string for empty or nullish input', () => {
      expect(convertCSSVariablesToString({})).toBe('');
      expect(
        convertCSSVariablesToString(
          undefined as unknown as Record<string, string>
        )
      ).toBe('');
    });
  });

  describe('validateCustomProperties', () => {
    it('keeps $-prefixed Carbon tokens with hexadecimal values', () => {
      const result = validateCustomProperties({ '$button-primary': '#1a1a2e' });
      expect(result['$button-primary']).toBe('#1a1a2e');
    });

    it('drops $-prefixed tokens whose value is not hexadecimal', () => {
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const result = validateCustomProperties({
        '$button-primary': 'rebeccapurple',
      });
      expect(result['$button-primary']).toBeUndefined();
      expect(warn).toHaveBeenCalledTimes(1);
      warn.mockRestore();
    });

    it('preserves bare shell tokens with non-color values', () => {
      const result = validateCustomProperties({
        width: '420px',
        'launcher-color-background': '#1a1a2e',
      });
      expect(result.width).toBe('420px');
      expect(result['launcher-color-background']).toBe('#1a1a2e');
    });

    it('drops the invalid token without mutating the map it was given', () => {
      // The caller's map is the merged config's, and `ChatAppEntry` holds that same
      // object as its change-detection baseline — see the note on the function.
      const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const hostProperties = { '$button-primary': 'rebeccapurple' };

      const result = validateCustomProperties(hostProperties);

      expect(result['$button-primary']).toBeUndefined();
      expect(hostProperties['$button-primary']).toBe('rebeccapurple');
      warn.mockRestore();
    });
  });
});
