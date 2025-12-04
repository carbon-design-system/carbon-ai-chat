/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import packageJson from "../../../package.json";

/**
 * Renders the component(s) script tag content and returns back the string
 *
 * @param {Array} components array of component names
 * @param {string} tag tag folder
 */
function _renderScript(components: Array<any>, tag: string) {
  const list = Array.isArray(components)
    ? components
    : components
      ? [components] // wrap string/object into array
      : [];

  let scripts = "";
  list.forEach((component) => {
    scripts += `<script type="module" src="https://chat.carbondesignsystem.com/components/version/${tag}/${component}.min.js"></script>\n`;
  });

  return scripts;
}

/**
 * This is the markdown block for JS via CDN
 *
 * @param {Array} components array of components to render
 */
export const cdnJs = (components: Array<any>) => {
  return `
## JS (via CDN)

 > NOTE: Only one version of artifacts should be used. Mixing versions will cause rendering issues.

 \`\`\`html
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

[Click here to learn more](https://github.com/carbon-design-system/carbon-for-ibm-dotcom/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.md)\n\n
  `;
};
