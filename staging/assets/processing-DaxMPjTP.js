import{j as e,M as a,a as t}from"./blocks-DoCvrWl0.js";import{useMDXComponents as c}from"./index-DmN1toKu.js";import{c as o,a as r}from"./storybook-cdn-CrF5ErHq.js";import{P as d}from"./processing.stories-opyuHv9h.js";import"./preload-helper-PPVm8Dsz.js";import"./iframe-9E7wC2q2.js";import"./settings-DVjgF8qf.js";import"./directive-gBWAn9fs.js";function i(s){const n={code:"code",h1:"h1",h2:"h2",h3:"h3",p:"p",pre:"pre",...c(),...s.components};return e.jsxs(e.Fragment,{children:[e.jsx(a,{of:d}),`
`,e.jsx(n.h1,{id:"ai-chat-processing",children:"AI Chat Processing"}),`
`,e.jsxs(n.p,{children:["The ",e.jsx(n.code,{children:"cds-aichat-processing"})," element is used to indicate that data is currently being processed/loaded and the user should wait.."]}),`
`,e.jsx(n.h2,{id:"getting-started",children:"Getting started"}),`
`,e.jsx(n.p,{children:"Here's a quick example to get you started."}),`
`,e.jsx(n.h3,{id:"js-via-import",children:"JS (via import)"}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-javascript",children:`import "@carbon/ai-chat-components/es/components/processing/index.js";
`})}),`
`,e.jsx(n.p,{children:"We provide a lit-react wrapper for this web component to consume in a react application and can be imported as below"}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-javascript",children:`import Processing from "@carbon/ai-chat-components/es/react/processing.js";
`})}),`
`,e.jsx(t,{children:`${o({components:["processing"]})}`}),`
`,e.jsx(t,{children:`${r()}`}),`
`,e.jsx(n.h3,{id:"html",children:"HTML"}),`
`,e.jsxs(n.p,{children:["Wrap any carbon ",e.jsx(n.code,{children:"tile"}),", ",e.jsx(n.code,{children:"clickable-tile"})," with ",e.jsx(n.code,{children:"cds-aichat-processing"}),` to get the styles.
The div containing the `,e.jsx(n.code,{children:"cds-aichat-processing-footer"})," will have all the footer styles with an additional class ",e.jsx(n.code,{children:"vertical"})," to change the buttons to stack."]}),`
`,e.jsx(n.pre,{children:e.jsx(n.code,{className:"language-html",children:`<cds-aichat-processing>
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
</cds-aichat-processing>
`})}),`
`,e.jsxs(n.h2,{id:"cds-aichat-processing-attributes-properties-and-events",children:[e.jsx(n.code,{children:"<cds-aichat-processing>"})," attributes, properties and events"]}),`
`,e.jsx(n.p,{children:"Note: This component is purely a styling parent, and does not bring in any attributes"})]})}function b(s={}){const{wrapper:n}={...c(),...s.components};return n?e.jsx(n,{...s,children:e.jsx(i,{...s})}):i(s)}export{b as default};
