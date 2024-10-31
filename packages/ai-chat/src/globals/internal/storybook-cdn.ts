/**
 * @license
 *
 * Copyright IBM Corp. 2024
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Renders the component(s) script tag content and returns back the string
 *
 * @param {Array} components array of component names
 * @param {string} version version
 */
function _renderScript(components, version) {
  let scripts = "";
  components.forEach((component) => {
    scripts += `<script type="module" src="https://1.www.s81c.com/common/carbon/x/${component}/${version}/index.min.js"></script>\n`;
  });
  return scripts;
}

/**
 * This is the markdown block for JS via CDN
 *
 * @param {Array} components array of components to render
 * @param {Array} components.components components to render
 * @param {object} packageJson package.json object
 */
export const cdnJs = ({ components }, packageJson) => {
  return `
### JS (via CDN)

 > NOTE: Only one version of artifacts should be used. Mixing versions will cause rendering issues.

 \`\`\`html
 // SPECIFIC VERSION (available starting v2.0.0)
 ${_renderScript(components, `v${packageJson.version}`)}
 \`\`\`
   `;
};

/**
 * This is the markdown block for CSS via CDN
 */
export const cdnCss = () => {
  return `
### Carbon CDN style helpers (optional)

There are optional CDN artifacts available that can assist with global Carbon
styles in lieu of including into your specific application bundle.

[Click here to learn more](https://github.com/carbon-design-system/carbon-for-ibm-dotcom/blob/main/packages/ai-chat/docs/carbon-cdn-style-helpers.md)\n\n
  `;
};
