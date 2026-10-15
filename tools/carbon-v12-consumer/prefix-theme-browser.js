/*
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

export function installFixtureTheme(css, label) {
  if (/@import\b/i.test(css)) {
    throw new Error('Offline fixture styles must not contain CSS imports.');
  }
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(css);
  let removedFontFaces = 0;
  // Fixture-only offline policy: keep Carbon's declared system-font fallbacks.
  for (let index = sheet.cssRules.length - 1; index >= 0; index -= 1) {
    if (sheet.cssRules[index].type === CSSRule.FONT_FACE_RULE) {
      sheet.deleteRule(index);
      removedFontFaces += 1;
    }
  }
  const retained = Array.from(sheet.cssRules, (rule) => rule.cssText).join(
    '\n'
  );
  if (/@font-face\b|url\(\s*["']?https?:/i.test(retained)) {
    throw new Error(
      'Offline fixture styles contain nested fonts or remote assets.'
    );
  }
  const style = document.createElement('style');
  style.dataset.fixtureTheme = label;
  style.textContent = retained;
  document.head.append(style);
  document.documentElement.classList.add('cds--white');
  window.prefixThemeEvidence ??= {};
  window.prefixThemeEvidence[label] = {
    fontPolicy:
      'Omit only public CSS font-face rules; preserve Carbon system-font fallbacks and all other rules.',
    removedFontFaces,
    retainedRules: sheet.cssRules.length,
  };
}
