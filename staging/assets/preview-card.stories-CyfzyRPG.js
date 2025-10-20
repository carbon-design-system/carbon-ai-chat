import{s as g}from"./story-styles-COVu3jCB.js";import{i as a}from"./focus-DdZH9Qba.js";import{e as o}from"./settings-DVjgF8qf.js";import{b as n}from"./iframe-9E7wC2q2.js";import"./directive-gBWAn9fs.js";import"./preload-helper-PPVm8Dsz.js";var u={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 16 16",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M13 7L12.3 6.3 8.5 10.1 8.5 1 7.5 1 7.5 10.1 3.7 6.3 3 7 8 12zM13 12v2H3v-2H2v2l0 0c0 .6.4 1 1 1h10c.6 0 1-.4 1-1l0 0v-2H13z"}}],name:"download",size:16},c={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 16 16",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M6 15L6 14 2.7 14 7 9.7 6.3 9 2 13.3 2 10 1 10 1 15zM10 1L10 2 13.3 2 9 6.3 9.7 7 14 2.7 14 6 15 6 15 1z"}}],name:"maximize",size:16},h={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 16 16",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M15.5,7.8C14.3,4.7,11.3,2.6,8,2.5C4.7,2.6,1.7,4.7,0.5,7.8c0,0.1,0,0.2,0,0.3c1.2,3.1,4.1,5.2,7.5,5.3	c3.3-0.1,6.3-2.2,7.5-5.3C15.5,8.1,15.5,7.9,15.5,7.8z M8,12.5c-2.7,0-5.4-2-6.5-4.5c1-2.5,3.8-4.5,6.5-4.5s5.4,2,6.5,4.5	C13.4,10.5,10.6,12.5,8,12.5z"}},{elem:"path",attrs:{d:"M8,5C6.3,5,5,6.3,5,8s1.3,3,3,3s3-1.3,3-3S9.7,5,8,5z M8,10c-1.1,0-2-0.9-2-2s0.9-2,2-2s2,0.9,2,2S9.1,10,8,10z"}}],name:"view",size:16},v={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 32 32",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M23,20a5,5,0,0,0-3.89,1.89L11.8,17.32a4.46,4.46,0,0,0,0-2.64l7.31-4.57A5,5,0,1,0,18,7a4.79,4.79,0,0,0,.2,1.32l-7.31,4.57a5,5,0,1,0,0,6.22l7.31,4.57A4.79,4.79,0,0,0,18,25a5,5,0,1,0,5-5ZM23,4a3,3,0,1,1-3,3A3,3,0,0,1,23,4ZM7,19a3,3,0,1,1,3-3A3,3,0,0,1,7,19Zm16,9a3,3,0,1,1,3-3A3,3,0,0,1,23,28Z"}}],name:"share",size:16},y={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 32 32",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M16,2V4H26V19h2V4a2.0023,2.0023,0,0,0-2-2Z"}},{elem:"path",attrs:{d:"M11,7V9H21V24h2V9a2.0023,2.0023,0,0,0-2-2Z"}},{elem:"path",attrs:{d:"M6,12H16a2.0023,2.0023,0,0,1,2,2V28a2.0023,2.0023,0,0,1-2,2H6a2.0023,2.0023,0,0,1-2-2V14A2.0023,2.0023,0,0,1,6,12Zm10,2L6,13.9988V28H16Z"}}],name:"version",size:16};/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */const{fn:r}=__STORYBOOK_MODULE_TEST__,d=n`
  <div slot="body-text">
    <p>AI Explained</p>
    <h2>84%</h2>
    <p>Confidence score</p>
    <p>
      Lorem ipsum dolor sit amet, di os consectetur adipiscing elit, sed do
      eiusmod tempor incididunt ut fsil labore et dolore magna aliqua.
    </p>
    <hr />
    <p>Model type</p>
    <a href="#">Foundation model</a>
  </div>
`,f={control:"radio",options:["unset","sm","md","lg"],mapping:{unset:"unset",sm:"291px",md:"438px",lg:"535px"},description:"Sets the max width of the story container. This is a story-only control and does not affect the component itself."},b={"2 ghost icon buttons":t=>n`
    <div data-rounded="bottom-right" class="display-flex">
      <cds-icon-button @click=${t.onClick} kind="ghost">
        ${a(u,{slot:"icon"})}
        <span slot="tooltip-content">Icon Description</span>
      </cds-icon-button>
      <cds-icon-button @click=${t.onClick} kind="ghost">
        ${a(c,{slot:"icon"})}
        <span slot="tooltip-content">Icon Description</span>
      </cds-icon-button>
    </div>
  `,"1 ghost button with icon":t=>n`
    <cds-button
      class="text-primary"
      @click=${t.onClick}
      size="md"
      kind="ghost"
    >
      View details
      ${a(c,{slot:"icon",style:"fill: var(--cds-link-primary)"})}
    </cds-button>
  `,"1 ghost button with viewing state":t=>n`
    <cds-button
      class="text-primary"
      @click=${t.onClick}
      size="md"
      kind="ghost"
      disabled
      data-viewing
    >
      ${a(h)} Viewing
    </cds-button>
  `,none:()=>""},m={"with label":()=>n`
    <div
      class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
    >
      <p class="body-compact-01 text-primary no-wrap">Step 1</p>
      <div>
        <p class="body-compact-01 text-secondary margin-bottom-02">
          Step title
        </p>
        <p class="label-01 text-secondary">Tool: Tool name</p>
      </div>
    </div>
    <div
      class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
    >
      <p class="body-compact-01 text-primary no-wrap">Step 2</p>
      <div>
        <p class="body-compact-01 text-secondary margin-bottom-02">
          Step title
        </p>
        <p class="label-01 text-secondary">Tool: Tool name</p>
      </div>
    </div>
    <div class="display-flex padding-inline gap-05 padding-block-04">
      <p class="body-compact-01 text-primary no-wrap">Step 2</p>
      <div>
        <p class="body-compact-01 text-secondary margin-bottom-02">
          Step title
        </p>
        <p class="label-01 text-secondary">Tool: Tool name</p>
      </div>
    </div>
  `,"title only":()=>n` <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 1</p>
        <div>
          <p class="body-compact-01 text-secondary">Step title</p>
        </div>
      </div>
      <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">Step title</p>
        </div>
      </div>
      <div class="display-flex padding-inline gap-05 padding-block-04">
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">Step title</p>
        </div>
      </div>`,"wrapping content":()=>n` <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 1</p>
        <div>
          <p class="body-compact-01 text-secondary">Lorem, ipsum.</p>
        </div>
      </div>
      <div
        class="display-flex padding-inline gap-05 padding-block-04 border-bottom"
      >
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">
            Lorem ipsum dolor sit, amet consectetur adipisicing elit.
          </p>
        </div>
      </div>
      <div class="display-flex padding-inline gap-05 padding-block-04">
        <p class="body-compact-01 text-primary no-wrap">Step 2</p>
        <div>
          <p class="body-compact-01 text-secondary">
            Lorem ipsum dolor sit amet consectetur adipisicing elit. Quod
            dignissimos distinctio minus placeat dicta dolores, rerum
            perspiciatis officia laudantium. Quasi!
          </p>
        </div>
      </div>`},A={title:"Components/Tile Container/Preview Card",argTypes:{maxWidth:f,useWrapper:{control:"boolean",description:"Toggle rendering inside <cds-aichat-tile-container>"},aiLabel:{control:"boolean"},footerActions:{control:"select",options:Object.keys(b),mapping:b,description:"Footer button variations"},layered:{control:"boolean",description:"this is a story only control, add `bg-layer` class on tile to make it layered <a target='_blank' href='https://w3.ibm.com/w3publisher/design-for-ai/carbon-for-ai/ai-chat-patterns/patterns#message-anatomy'>more info on layering</a>"},onClick:{action:"onClick"}},args:{layered:!1},decorators:[(t,{args:p})=>n`
      <style>
        ${g}
      </style>
      <div style="max-width: ${p.maxWidth};">
        ${p.useWrapper?n`<cds-aichat-tile-container
              >${t()}</cds-aichat-tile-container
            >`:t()}
      </div>
    `]},e={argTypes:{maxWidth:{table:{disable:!0}}},args:{maxWidth:"sm",useWrapper:!0,aiLabel:!0,footerActions:"2 ghost icon buttons",onClick:r()},render:t=>n`
    <cds-tile
      data-rounded
      class=${o({"bg-layer":t.layered})}
    >
      <h5 class="body-compact-02 margin-bottom-01">Document title</h5>
      <p class="helper-text-01 text-secondary">Subtitle</p>
      ${t.aiLabel?n`<cds-ai-label
            data-testid="ai-label"
            size="mini"
            autoalign
            alignment="bottom-left"
            slot=""
          >
            ${d}
          </cds-ai-label>`:""}
      ${t.footerActions(t)?n`<div
            class=${o({"cds-aichat--tile-container-footer":!0,"margin-top-05":!0})}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${t.footerActions(t)}
          </div>`:""}
    </cds-tile>
  `},i={argTypes:{maxWidth:{table:{disable:!0}},footerActions:{table:{disable:!0}}},args:{maxWidth:"lg",useWrapper:!0,aiLabel:!0,footerActions:"1 ghost button with icon",onClick:r()},render:t=>n`
    <cds-tile
      data-rounded
      class=${o({"bg-layer":t.layered})}
    >
      <h5 class="body-compact-02 margin-bottom-01">Document title</h5>
      <p class="helper-text-01 text-secondary margin-bottom-03">Subtitle</p>
      <p class="helper-text-01 text-secondary">Subtitle</p>
      ${t.aiLabel?n`<cds-ai-label
            data-testid="ai-label"
            size="mini"
            autoalign
            alignment="bottom-left"
            slot=""
          >
            ${d}
          </cds-ai-label>`:""}

      <div
        data-flush
        class="border-top margin-bottom-04 margin-top-04 padding-inline"
      >
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
      ${t.footerActions(t)?n`<div
            class=${o({"cds-aichat--tile-container-footer":!0,"margin-top-05":!0})}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${t.footerActions(t)}
          </div>`:""}
    </cds-tile>
  `},s={argTypes:{maxWidth:{table:{disable:!0}},footerActions:{table:{disable:!0}}},args:{maxWidth:"lg",useWrapper:!0,aiLabel:!0,onClick:r()},render:t=>n`
    <cds-tile
      data-rounded
      class=${o({"bg-layer":t.layered})}
    >
      <div
        data-rounded="top"
        data-flush
        class="cds-aichat--tile-container-toolbar"
      >
        <h5 class="flex-1 body-compact-02 padding-inline align-content-center">
          Resource comsumption
        </h5>
        <div data-rounded="top-right" class="display-flex">
          ${t.aiLabel?n`<cds-ai-label
                class="inline-size-08"
                data-testid="ai-label"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                ${d}
              </cds-ai-label>`:""}
          <cds-icon-button @click=${t.onClick} kind="ghost">
            ${a(y,{slot:"icon"})}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${t.onClick} kind="ghost">
            ${a(u,{slot:"icon"})}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${t.onClick} kind="ghost">
            ${a(v,{slot:"icon"})}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=${t.onClick} kind="ghost">
            ${a(c,{slot:"icon"})}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
        </div>
      </div>
      <div data-flush class="border-top margin-top-05 padding-inline">
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
    </cds-tile>
  `},l={argTypes:{maxWidth:{table:{disable:!0}},footerActions:{table:{disable:!0}},stepVariation:{control:"select",options:Object.keys(m),mapping:m,description:"step variations"}},args:{maxWidth:"lg",useWrapper:!0,stepVariation:"with label",footerActions:"1 ghost button with icon",aiLabel:!0,onClick:r()},render:t=>n`
    <cds-tile
      data-rounded
      class=${o({"bg-layer":t.layered})}
    >
      <div
        data-rounded="top"
        data-flush
        class="cds-aichat--tile-container-toolbar"
      >
        <h5
          class="flex-1 body-compact-02 padding-inline align-content-center block-size-08"
        >
          Plan Title
        </h5>
        <div data-rounded="top-right" class="display-flex">
          ${t.aiLabel?n`<cds-ai-label
                class="inline-size-08"
                data-testid="ai-label"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                ${d}
              </cds-ai-label>`:""}
        </div>
      </div>
      <div data-flush class="border-top margin-top-05">
        ${t.stepVariation(t)}
      </div>
      ${t.footerActions(t)?n`<div
            class=${o({"cds-aichat--tile-container-footer":!0,"margin-top-05":!0})}
            data-flush="bottom"
            data-rounded="bottom"
          >
            ${t.footerActions(t)}
          </div>`:""}
    </cds-tile>
  `};e.parameters={...e.parameters,docs:{...e.parameters?.docs,source:{originalSource:`{
  argTypes: {
    maxWidth: {
      table: {
        disable: true
      }
    }
  },
  args: {
    maxWidth: "sm",
    useWrapper: true,
    aiLabel: true,
    footerActions: "2 ghost icon buttons",
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      data-rounded
      class=\${classMap({
    "bg-layer": args.layered
  })}
    >
      <h5 class="body-compact-02 margin-bottom-01">Document title</h5>
      <p class="helper-text-01 text-secondary">Subtitle</p>
      \${args.aiLabel ? html\`<cds-ai-label
            data-testid="ai-label"
            size="mini"
            autoalign
            alignment="bottom-left"
            slot=""
          >
            \${aiContent}
          </cds-ai-label>\` : ""}
      \${args.footerActions(args) ? html\`<div
            class=\${classMap({
    "cds-aichat--tile-container-footer": true,
    "margin-top-05": true
  })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            \${args.footerActions(args)}
          </div>\` : ""}
    </cds-tile>
  \`
}`,...e.parameters?.docs?.source}}};i.parameters={...i.parameters,docs:{...i.parameters?.docs,source:{originalSource:`{
  argTypes: {
    maxWidth: {
      table: {
        disable: true
      }
    },
    footerActions: {
      table: {
        disable: true
      }
    }
  },
  args: {
    maxWidth: "lg",
    useWrapper: true,
    aiLabel: true,
    footerActions: "1 ghost button with icon",
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      data-rounded
      class=\${classMap({
    "bg-layer": args.layered
  })}
    >
      <h5 class="body-compact-02 margin-bottom-01">Document title</h5>
      <p class="helper-text-01 text-secondary margin-bottom-03">Subtitle</p>
      <p class="helper-text-01 text-secondary">Subtitle</p>
      \${args.aiLabel ? html\`<cds-ai-label
            data-testid="ai-label"
            size="mini"
            autoalign
            alignment="bottom-left"
            slot=""
          >
            \${aiContent}
          </cds-ai-label>\` : ""}

      <div
        data-flush
        class="border-top margin-bottom-04 margin-top-04 padding-inline"
      >
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
      \${args.footerActions(args) ? html\`<div
            class=\${classMap({
    "cds-aichat--tile-container-footer": true,
    "margin-top-05": true
  })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            \${args.footerActions(args)}
          </div>\` : ""}
    </cds-tile>
  \`
}`,...i.parameters?.docs?.source}}};s.parameters={...s.parameters,docs:{...s.parameters?.docs,source:{originalSource:`{
  argTypes: {
    maxWidth: {
      table: {
        disable: true
      }
    },
    footerActions: {
      table: {
        disable: true
      }
    }
  },
  args: {
    maxWidth: "lg",
    useWrapper: true,
    aiLabel: true,
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      data-rounded
      class=\${classMap({
    "bg-layer": args.layered
  })}
    >
      <div
        data-rounded="top"
        data-flush
        class="cds-aichat--tile-container-toolbar"
      >
        <h5 class="flex-1 body-compact-02 padding-inline align-content-center">
          Resource comsumption
        </h5>
        <div data-rounded="top-right" class="display-flex">
          \${args.aiLabel ? html\`<cds-ai-label
                class="inline-size-08"
                data-testid="ai-label"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                \${aiContent}
              </cds-ai-label>\` : ""}
          <cds-icon-button @click=\${args.onClick} kind="ghost">
            \${iconLoader(Version16, {
    slot: "icon"
  })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=\${args.onClick} kind="ghost">
            \${iconLoader(Download16, {
    slot: "icon"
  })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=\${args.onClick} kind="ghost">
            \${iconLoader(Share16, {
    slot: "icon"
  })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
          <cds-icon-button @click=\${args.onClick} kind="ghost">
            \${iconLoader(Maximize16, {
    slot: "icon"
  })}
            <span slot="tooltip-content">Icon Description</span>
          </cds-icon-button>
        </div>
      </div>
      <div data-flush class="border-top margin-top-05 padding-inline">
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
        <br />
      </div>
    </cds-tile>
  \`
}`,...s.parameters?.docs?.source}}};l.parameters={...l.parameters,docs:{...l.parameters?.docs,source:{originalSource:`{
  argTypes: {
    maxWidth: {
      table: {
        disable: true
      }
    },
    footerActions: {
      table: {
        disable: true
      }
    },
    stepVariation: {
      control: "select",
      options: Object.keys(stepVariation),
      mapping: stepVariation,
      description: "step variations"
    }
  },
  args: {
    maxWidth: "lg",
    useWrapper: true,
    stepVariation: "with label",
    footerActions: "1 ghost button with icon",
    aiLabel: true,
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      data-rounded
      class=\${classMap({
    "bg-layer": args.layered
  })}
    >
      <div
        data-rounded="top"
        data-flush
        class="cds-aichat--tile-container-toolbar"
      >
        <h5
          class="flex-1 body-compact-02 padding-inline align-content-center block-size-08"
        >
          Plan Title
        </h5>
        <div data-rounded="top-right" class="display-flex">
          \${args.aiLabel ? html\`<cds-ai-label
                class="inline-size-08"
                data-testid="ai-label"
                size="mini"
                autoalign
                alignment="bottom-left"
                slot=""
              >
                \${aiContent}
              </cds-ai-label>\` : ""}
        </div>
      </div>
      <div data-flush class="border-top margin-top-05">
        \${args.stepVariation(args)}
      </div>
      \${args.footerActions(args) ? html\`<div
            class=\${classMap({
    "cds-aichat--tile-container-footer": true,
    "margin-top-05": true
  })}
            data-flush="bottom"
            data-rounded="bottom"
          >
            \${args.footerActions(args)}
          </div>\` : ""}
    </cds-tile>
  \`
}`,...l.parameters?.docs?.source}}};const W=["Small","Default","DefaultWithToolbar","WithSteps"];export{i as Default,s as DefaultWithToolbar,e as Small,l as WithSteps,W as __namedExportsOrder,A as default};
