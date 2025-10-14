import{j as e,c,e as s,A as a}from"./index-BxsTGbyI.js";import{useMDXComponents as i}from"./index-HtqABsik.js";import{E as l}from"./extended-button.stories-DFHqv16k.js";import"./iframe-BctamlpQ.js";import"./index-CiTn9rB-.js";import"./_commonjsHelpers-Cpj98o6Y.js";import"./index-BJuP8JF6.js";import"./index-DrFu-skq.js";import"./lit-element-Ck-nUsG6.js";const p="0.2.1",h={version:p};/*
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
 */function x(n,t){let o="";return n.forEach(d=>{o+=`<script type="module" src="https://1.www.s81c.com/common/carbon/ai-chat/${t}/${d}.min.js"><\/script>
`}),o}const u=({components:n})=>`
### JS (via CDN)

 > NOTE: Only one version of artifacts should be used. Mixing versions will cause rendering issues.

 \`\`\`html
 // SPECIFIC VERSION (available starting v2.0.0)
 ${x(n,`version/v${h.version}`)}
 \`\`\`
   `,m=()=>`
### Carbon CDN style helpers (optional)

There are optional CDN artifacts available that can assist with global Carbon
styles in lieu of including into your specific application bundle.

[Click here to learn more](https://github.com/carbon-design-system/carbon-for-ibm-dotcom/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.md)


  `;function r(n){const t={code:"code",h1:"h1",h2:"h2",h3:"h3",p:"p",pre:"pre",...i(),...n.components};return e.jsxs(e.Fragment,{children:[e.jsx(c,{of:l}),`
`,e.jsx(t.h1,{id:"extended-button",children:"Extended Button"}),`
`,e.jsx(t.p,{children:"[Insert blurb of component and its usage here]"}),`
`,e.jsx(t.h2,{id:"getting-started",children:"Getting started"}),`
`,e.jsx(t.p,{children:"Here's a quick example to get you started."}),`
`,e.jsx(t.h3,{id:"js-via-import",children:"JS (via import)"}),`
`,e.jsx(t.pre,{children:e.jsx(t.code,{className:"language-javascript",children:`import "@carbon/web-components/es/components/extended-button/index.js";
`})}),`
`,e.jsx(s,{children:`${u({components:["extended-button"]})}`}),`
`,e.jsx(s,{children:`${m()}`}),`
`,e.jsx(t.h3,{id:"html",children:"HTML"}),`
`,e.jsx(t.pre,{children:e.jsx(t.code,{className:"language-html",children:`<prefix-extended-button> Extended button </prefix-extended-button>
`})}),`
`,e.jsxs(t.h2,{id:"prefix-extended-button-attributes-properties-and-events",children:[e.jsx(t.code,{children:"<prefix-extended-button>"})," attributes, properties and events"]}),`
`,e.jsxs(t.p,{children:["Note: For ",e.jsx(t.code,{children:"boolean"})," attributes, ",e.jsx(t.code,{children:"true"}),` means simply setting the attribute (e.g.
`,e.jsx(t.code,{children:"<prefix-extended-button open>"}),") and ",e.jsx(t.code,{children:"false"}),` means not setting the attribute (e.g.
`,e.jsx(t.code,{children:"<prefix-extended-button>"})," without ",e.jsx(t.code,{children:"open"})," attribute)."]}),`
`,e.jsx(a,{of:"prefix-extended-button"})]})}function M(n={}){const{wrapper:t}={...i(),...n.components};return t?e.jsx(t,{...n,children:e.jsx(r,{...n})}):r(n)}export{M as default};
