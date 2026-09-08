/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

interface Settings {
  framework: 'react' | 'web-component';
  layout: 'float' | 'sidebar' | 'fullscreen';
  writeableElements: 'true' | 'false';
  hideDefaultAiLabelContent?: 'true' | 'false';
  /**
   * Renders markdown tables through `markdown.customRenderers.table` instead
   * of the built-in Carbon table. Deep-link only — there is no sidebar
   * switcher, because the reason it exists is a Playwright case that proves a
   * page stylesheet reaches the node the callback returns, and that only holds
   * while the node sits in page light DOM.
   */
  markdownCustomRenderers?: 'true' | 'false';
  direction: 'default' | 'ltr' | 'rtl';
  showHeader?: boolean;
  showMenuOptions?: boolean;
  showSampleActions?: boolean;
}

interface KeyPairs {
  key: string;
  value: string;
}

export { KeyPairs, Settings };
