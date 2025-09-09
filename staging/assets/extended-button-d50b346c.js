import{ak as e,al as a,am as o,an as l}from"./index-17746fca.js";import{u as i}from"./index-d452a0b1.js";import{E as p}from"./extended-button.stories-7c330626.js";import"./iframe-753670d0.js";import"./index-59f6f3fa.js";import"./_commonjsHelpers-725317a4.js";import"./index-28c84956.js";import"./index-356e4a49.js";import"./lit-element-f681bf4e.js";const d="@carbon/ai-chat-components",u="0.2.1-rc.0",m="module",b="Apache-2.0",h={type:"git",url:"https://github.com/carbon-design-system/carbon-ai-chat",directory:"packages/ai-chat"},x={access:"public",provenance:!0},g={"./es/*":"./es/*","./dist/*":"./dist/*","./custom-elements.json":"./custom-elements.json","./package.json":"./package.json"},y=["es/**/*","dist/**/*","custom-elements.json","package.json","telemetry.yml"],j={build:"npm run clean && npm run custom-elements && node tasks/build.js && node tasks/build-dist.js",clean:"rimraf es dist storybook-static","custom-elements":"cem analyze --config ./custom-elements-manifest.config.js",postinstall:"ibmtelemetry --config=telemetry.yml",storybook:"npm run custom-elements && storybook dev -p 6006","storybook:build":"npm run custom-elements && storybook build",test:'web-test-runner "src/components/**/*.test.ts" --node-resolve',"test:updateSnapshot":'web-test-runner "src/components/**/*.test.ts" --node-resolve --update-snapshots'},f={"@carbon/styles":"^1.39.0","@carbon/web-components":"^2.13.0","@ibm/telemetry-js":"^1.9.1",lit:"^3.0.0",tslib:"^2.6.3"},v={"@carbon/grid":"^11.20.0","@carbon/icon-helpers":"^10.44.0","@carbon/icons":"^11.28.0","@carbon/layout":"^11.19.0","@carbon/themes":"^11.25.0","@custom-elements-manifest/analyzer":"^0.10.0","@isaacs/brace-expansion":"^5.0.0","@mordech/vite-lit-loader":"^0.37.0","@open-wc/testing":"4.0.0","@rollup/plugin-alias":"^5.1.1","@rollup/plugin-commonjs":"^28.0.1","@rollup/plugin-node-resolve":"^16.0.1","@rollup/plugin-replace":"^6.0.1","@rollup/plugin-terser":"^0.4.4","@rollup/plugin-typescript":"^11.0.0","@storybook/addon-a11y":"^8.4.0","@storybook/addon-essentials":"^8.4.0","@storybook/addon-links":"^8.4.1","@storybook/web-components":"^8.4.0","@storybook/web-components-vite":"^8.4.0","@types/jest":"^29.5.14","@web/dev-server":"0.4.6","@web/dev-server-esbuild":"0.4.4","@web/test-runner":"0.19.0","@web/test-runner-playwright":"^0.11.0",autoprefixer:"^10.4.20",globby:"^14.0.2",playwright:"^1.48.1",react:"^18.2.0","react-dom":"^18.2.0","read-package-up":"^11.0.0","remark-gfm":"^4.0.0",rimraf:"^6.0.1",rollup:"^3.29.4","rollup-plugin-postcss":"^4.0.2","rollup-plugin-postcss-lit":"^2.1.0",storybook:"^8.0.0",typescript:"^5.2.2",vite:"^4.4.5","web-dev-server-plugin-lit-css":"^3.0.1"},k={name:d,version:u,private:!0,type:m,license:b,repository:h,publishConfig:x,exports:g,files:y,scripts:j,dependencies:f,devDependencies:v};/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 *//**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */function w(n,t){let s="";return n.forEach(c=>{s+=`<script type="module" src="https://1.www.s81c.com/common/carbon/ai-chat/${t}/${c}.min.js"><\/script>
`}),s}const C=({components:n})=>`
### JS (via CDN)

 > NOTE: Only one version of artifacts should be used. Mixing versions will cause rendering issues.

 \`\`\`html
 // SPECIFIC VERSION (available starting v2.0.0)
 ${w(n,`version/v${k.version}`)}
 \`\`\`
   `,E=()=>`
### Carbon CDN style helpers (optional)

There are optional CDN artifacts available that can assist with global Carbon
styles in lieu of including into your specific application bundle.

[Click here to learn more](https://github.com/carbon-design-system/carbon-for-ibm-dotcom/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.md)


  `;function r(n){const t={code:"code",h1:"h1",h2:"h2",h3:"h3",p:"p",pre:"pre",...i(),...n.components};return e.jsxs(e.Fragment,{children:[e.jsx(a,{of:p}),`
`,e.jsx(t.h1,{id:"extended-button",children:"Extended Button"}),`
`,e.jsx(t.p,{children:"[Insert blurb of component and its usage here]"}),`
`,e.jsx(t.h2,{id:"getting-started",children:"Getting started"}),`
`,e.jsx(t.p,{children:"Here's a quick example to get you started."}),`
`,e.jsx(t.h3,{id:"js-via-import",children:"JS (via import)"}),`
`,e.jsx(t.pre,{children:e.jsx(t.code,{className:"language-javascript",children:`import "@carbon/web-components/es/components/extended-button/index.js";
`})}),`
`,e.jsx(o,{children:`${C({components:["extended-button"]})}`}),`
`,e.jsx(o,{children:`${E()}`}),`
`,e.jsx(t.h3,{id:"html",children:"HTML"}),`
`,e.jsx(t.pre,{children:e.jsx(t.code,{className:"language-html",children:`<prefix-extended-button> Extended button </prefix-extended-button>
`})}),`
`,e.jsxs(t.h2,{id:"prefix-extended-button-attributes-properties-and-events",children:[e.jsx(t.code,{children:"<prefix-extended-button>"})," attributes, properties and events"]}),`
`,e.jsxs(t.p,{children:["Note: For ",e.jsx(t.code,{children:"boolean"})," attributes, ",e.jsx(t.code,{children:"true"}),` means simply setting the attribute (e.g.
`,e.jsx(t.code,{children:"<prefix-extended-button open>"}),") and ",e.jsx(t.code,{children:"false"}),` means not setting the attribute (e.g.
`,e.jsx(t.code,{children:"<prefix-extended-button>"})," without ",e.jsx(t.code,{children:"open"})," attribute)."]}),`
`,e.jsx(l,{of:"prefix-extended-button"})]})}function O(n={}){const{wrapper:t}={...i(),...n.components};return t?e.jsx(t,{...n,children:e.jsx(r,{...n})}):r(n)}export{O as default};
