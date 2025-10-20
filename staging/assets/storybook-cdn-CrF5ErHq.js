const t="0.2.1",i={version:t};/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */function a(s,e){let n="";return s.forEach(o=>{n+=`<script type="module" src="https://1.www.s81c.com/common/carbon/ai-chat/${e}/${o}.min.js"><\/script>
`}),n}const r=({components:s})=>`
### JS (via CDN)

 > NOTE: Only one version of artifacts should be used. Mixing versions will cause rendering issues.

 \`\`\`html
 // SPECIFIC VERSION (available starting v2.0.0)
 ${a(s,`version/v${i.version}`)}
 \`\`\`
   `,c=()=>`
### Carbon CDN style helpers (optional)

There are optional CDN artifacts available that can assist with global Carbon
styles in lieu of including into your specific application bundle.

[Click here to learn more](https://github.com/carbon-design-system/carbon-for-ibm-dotcom/blob/main/packages/web-components/docs/carbon-cdn-style-helpers.md)


  `;export{c as a,r as c};
