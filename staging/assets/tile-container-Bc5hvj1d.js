import{j as e,M as s,a as i}from"./blocks-DoCvrWl0.js";import{useMDXComponents as o}from"./index-DmN1toKu.js";import{c,a as r}from"./storybook-cdn-CrF5ErHq.js";import{T as l}from"./tile-container.stories-BwUNKy44.js";import"./preload-helper-PPVm8Dsz.js";import"./iframe-9E7wC2q2.js";import"./story-styles-COVu3jCB.js";import"./settings-DVjgF8qf.js";import"./directive-gBWAn9fs.js";import"./focus-DdZH9Qba.js";function a(t){const n={a:"a",code:"code",h1:"h1",h2:"h2",h3:"h3",p:"p",pre:"pre",...o(),...t.components};return e.jsxs(e.Fragment,{children:[e.jsx(s,{of:l}),`
`,e.jsx(n.h1,{id:"ai-chat-tile-container",children:"AI Chat Tile Container"}),`
`,e.jsxs(n.p,{children:["The ",e.jsx(n.code,{children:"cds-aichat-tile-container"})," wraps the Carbon Design System's ",e.jsx(n.a,{href:"https://web-components.carbondesignsystem.com/?path=/docs/components-tile--overview",rel:"nofollow",children:"Tile"}),` component to apply AI Chat styles.
if using a footer, `,e.jsx(n.code,{children:"cds-aichat-tile-container-footer"})," class name needs to be added to the footer element, with an additional class vertical to get the vertical button layout."]}),`
`,e.jsx(n.h2,{id:"getting-started",children:"Getting started"}),`
`,e.jsx(n.p,{children:"Here's a quick example to get you started."}),`
`,e.jsx(n.h3,{id:"js-via-import",children:"JS (via import)"}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-javascript",children:`import "@carbon/ai-chat-components/es/components/tile-container/index.js";
`})}),`
`,e.jsx(n.p,{children:"We provide a lit-react wrapper for this web component to consume in a react application and can be imported as below"}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-javascript",children:`import TileContainer from "@carbon/ai-chat-components/es/react/tile-container.js";
`})}),`
`,e.jsx(i,{children:`${c({components:["tile-container"]})}`}),`
`,e.jsx(i,{children:`${r()}`}),`
`,e.jsx(n.h3,{id:"html",children:"HTML"}),`
`,e.jsxs(n.p,{children:["Wrap any carbon ",e.jsx(n.code,{children:"tile"}),", ",e.jsx(n.code,{children:"clickable-tile"})," with ",e.jsx(n.code,{children:"cds-aichat-tile-container"}),` to get the styles.
The div containing the `,e.jsx(n.code,{children:"cds-aichat-tile-container-footer"})," will have all the footer styles with an additional class ",e.jsx(n.code,{children:"vertical"})," to change the buttons to stack."]}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-html",children:`<cds-aichat-tile-container>
  <cds-tile>
    <h5 class="heading-01 margin-bottom-04">
      AI Chat Tile styling wrapper
    </h5>
    <p class="body-01">
      The Carbon Design System provides a comprehensive library of
      components, tokens, and guidelines. We need to implement the new AI
      Chat component following Carbon's design principles and accessibility
      standards.
    </p>
  </cds-tile>
</cds-aichat-tile-container>
`})}),`
`,e.jsxs(n.h2,{id:"cds-aichat-tile-container-attributes-properties-and-events",children:[e.jsx(n.code,{children:"<cds-aichat-tile-container>"})," attributes, properties and events"]}),`
`,e.jsx(n.p,{children:"Note: This component is purely a styling parent, and does not bring in any attributes"})]})}function y(t={}){const{wrapper:n}={...o(),...t.components};return n?e.jsx(n,{...t,children:e.jsx(a,{...t})}):a(t)}export{y as default};
