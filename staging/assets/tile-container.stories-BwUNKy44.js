import{e as E,a as B,F as V,s as j}from"./story-styles-COVu3jCB.js";import{_ as o,c as z,F,p as s,o as u,i as p}from"./focus-DdZH9Qba.js";import{c as H,i as I,b as n}from"./iframe-9E7wC2q2.js";import{e as l}from"./settings-DVjgF8qf.js";import{n as r}from"./directive-gBWAn9fs.js";var N=H([".cds--link{border:0;box-sizing:border-box;color:var(--cds-link-text-color,var(--cds-link-primary,#0f62fe));display:inline-flex;font-family:inherit;font-size:100%;font-size:var(--cds-body-compact-01-font-size,.875rem);font-weight:var(--cds-body-compact-01-font-weight,400);letter-spacing:var(--cds-body-compact-01-letter-spacing,.16px);line-height:var(--cds-body-compact-01-line-height,1.28572);margin:0;outline:none;padding:0;text-decoration:none;transition:color 70ms cubic-bezier(.2,0,.38,.9);vertical-align:baseline}.cds--link *,.cds--link :after,.cds--link :before{box-sizing:inherit}.cds--link:hover{color:var(--cds-link-hover-text-color,var(--cds-link-primary-hover,#0043ce));text-decoration:underline}.cds--link:active:not(.cds--link--disabled),.cds--link:active:visited,.cds--link:active:visited:hover{color:var(--cds-link-text-color,var(--cds-link-primary,#0f62fe));outline:1px solid var(--cds-focus,#0f62fe);outline-color:var(--cds-link-focus-text-color,var(--cds-focus,#0f62fe));text-decoration:underline}@media screen and (prefers-contrast){.cds--link:active:not(.cds--link--disabled),.cds--link:active:visited,.cds--link:active:visited:hover{outline-style:dotted}}.cds--link:focus:not(.cds--link--disabled){outline:1px solid var(--cds-focus,#0f62fe);outline-color:var(--cds-link-focus-text-color,var(--cds-focus,#0f62fe));text-decoration:underline}@media screen and (prefers-contrast){.cds--link:focus:not(.cds--link--disabled){outline-style:dotted}}.cds--link:visited{color:var(--cds-link-text-color,var(--cds-link-primary,#0f62fe))}.cds--link:visited:hover{color:var(--cds-link-hover-text-color,var(--cds-link-primary-hover,#0043ce))}.cds--link--disabled,.cds--link--disabled:hover{border:0;box-sizing:border-box;color:var(--cds-text-disabled,hsla(0,0%,9%,.25));cursor:not-allowed;font-family:inherit;font-size:100%;font-size:var(--cds-body-compact-01-font-size,.875rem);font-weight:var(--cds-body-compact-01-font-weight,400);font-weight:400;letter-spacing:var(--cds-body-compact-01-letter-spacing,.16px);line-height:var(--cds-body-compact-01-line-height,1.28572);margin:0;padding:0;text-decoration:none;vertical-align:baseline}.cds--link--disabled *,.cds--link--disabled :after,.cds--link--disabled :before,.cds--link--disabled:hover *,.cds--link--disabled:hover :after,.cds--link--disabled:hover :before{box-sizing:inherit}.cds--link.cds--link--visited:visited{color:var(--cds-link-visited-text-color,var(--cds-link-visited,#8a3ffc))}.cds--link.cds--link--visited:visited:hover{color:var(--cds-link-hover-text-color,var(--cds-link-primary-hover,#0043ce))}.cds--link.cds--link--inline{display:inline;text-decoration:underline}.cds--link--disabled.cds--link--inline{text-decoration:underline}.cds--link--sm,.cds--link--sm.cds--link--disabled:hover{font-size:var(--cds-helper-text-01-font-size,.75rem);letter-spacing:var(--cds-helper-text-01-letter-spacing,.32px);line-height:var(--cds-helper-text-01-line-height,1.33333)}.cds--link--lg,.cds--link--lg.cds--link--disabled:hover{font-size:var(--cds-body-compact-02-font-size,1rem);font-weight:var(--cds-body-compact-02-font-weight,400);letter-spacing:var(--cds-body-compact-02-letter-spacing,0);line-height:var(--cds-body-compact-02-line-height,1.375)}.cds--link__icon{align-self:center;display:inline-flex;margin-inline-start:.5rem}:host(cds-link){outline:none}:host(cds-link) .cds--link--disabled{color:var(--cds-text-disabled,hsla(0,0%,9%,.25))}:host(cds-link) .cds--link__icon[hidden]{display:none}"]);const U={MEDIUM:"md"};let a=class extends F(I){constructor(){super(...arguments),this._hasIcon=!1,this.disabled=!1,this.inline=!1,this.size=U.MEDIUM,this.visited=!1}_handleSlotChange({target:t}){const{name:i}=t,c=t.assignedNodes().some(d=>d.nodeType!==Node.TEXT_NODE||d.textContent.trim());this[i==="icon"?"_hasIcon":""]=c,this.requestUpdate()}get _classes(){const{disabled:t,size:i,inline:c,visited:d,_hasIcon:b}=this;return l({[`${s}--link`]:!0,[`${s}--link--disabled`]:t,[`${s}--link--icon`]:b,[`${s}--link--inline`]:c,[`${s}--link--${i}`]:i,[`${s}--link--visited`]:d})}_handleClick(t){}_renderInner(){const{_hasIcon:t,_handleSlotChange:i}=this;return n`
      <slot @slotchange="${i}"></slot>
      <div ?hidden="${!t}" class="${s}--link__icon">
        <slot name="icon" @slotchange="${i}"></slot>
      </div>
    `}_renderDisabledLink(){const{_classes:t}=this;return n`
      <p id="link" part="link" class="${t}">${this._renderInner()}</p>
    `}_renderLink(){const{download:t,href:i,hreflang:c,linkRole:d,ping:b,rel:L,target:M,type:O,_classes:R,_handleClick:D}=this;return n`
      <a
        tabindex="0"
        id="link"
        role="${u(d)}"
        class="${R}"
        part="link"
        download="${u(t)}"
        href="${u(i)}"
        hreflang="${u(c)}"
        ping="${u(b)}"
        rel="${u(L)}"
        target="${u(M)}"
        type="${u(O)}"
        @click="${D}">
        ${this._renderInner()}
      </a>
    `}render(){const{disabled:t}=this;return t?this._renderDisabledLink():this._renderLink()}};a.shadowRootOptions=Object.assign(Object.assign({},I.shadowRootOptions),{delegatesFocus:!0});a.styles=N;o([E("#link")],a.prototype,"_linkNode",void 0);o([r({type:Boolean,reflect:!0})],a.prototype,"disabled",void 0);o([r({reflect:!0})],a.prototype,"download",void 0);o([r({reflect:!0})],a.prototype,"href",void 0);o([r({reflect:!0})],a.prototype,"hreflang",void 0);o([r({type:Boolean,reflect:!0})],a.prototype,"inline",void 0);o([r({attribute:"link-role"})],a.prototype,"linkRole",void 0);o([r({reflect:!0})],a.prototype,"ping",void 0);o([r({reflect:!0})],a.prototype,"rel",void 0);o([r({reflect:!0})],a.prototype,"size",void 0);o([r({reflect:!0})],a.prototype,"target",void 0);o([r({reflect:!0})],a.prototype,"type",void 0);o([r({type:Boolean,reflect:!0})],a.prototype,"visited",void 0);a=o([z(`${s}-link`)],a);var Y=a,Z={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 32 32",fill:"currentColor",width:24,height:24},content:[{elem:"path",attrs:{d:"M19 21v-2h1v-7h-1v-2h4v2h-1v7h1v2h-4zM15.5005 21h2l-3.5005-11h-3l-3.4966 11h1.9988l.6018-2h4.7781l.6184 2zM10.7058 17l1.6284-5.4111.2559-.0024 1.6736 5.4136h-3.5579z"}},{elem:"path",attrs:{d:"M32,32H0V0h32v32ZM2,30h28V2H2v28Z"}}],name:"ai-label",size:24};let m=class extends Y{constructor(){super(...arguments),this.colorScheme=V.REGULAR,this.linkRole="button",this.hasRoundedCorners=!1,this.aiLabel=!1,this.slug=!1}get _classes(){const{colorScheme:t,disabled:i,hasRoundedCorners:c,aiLabel:d,slug:b}=this;return l({[`${s}--link`]:!0,[`${s}--link--disabled`]:i,[`${s}--tile`]:!0,[`${s}--tile--clickable`]:!0,[`${s}--tile--${t}`]:t,[`${s}--tile--slug-rounded`]:(d||b)&&c})}connectedCallback(){this.slug&&(this.setAttribute("ai-Label",""),this.aiLabel=!0),super.connectedCallback()}_renderInner(){return n`
      ${super._renderInner()}
      ${this.aiLabel||this.slug?p(Z,{class:`${s}--tile--ai-label-icon`}):""}
      <slot name="decorator"></slot>
    `}static get slugItem(){return`${s}-slug`}static get aiLabelItem(){return`${s}-ai-label`}};m.styles=B;o([r({attribute:"color-scheme",reflect:!0})],m.prototype,"colorScheme",void 0);o([r({attribute:"link-role"})],m.prototype,"linkRole",void 0);o([r({type:Boolean,attribute:"has-rounded-corners"})],m.prototype,"hasRoundedCorners",void 0);o([r({type:Boolean,attribute:"ai-label"})],m.prototype,"aiLabel",void 0);o([r({type:Boolean})],m.prototype,"slug",void 0);m=o([z(`${s}-clickable-tile`)],m);var K={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 32 32",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M29.25,6.76a6,6,0,0,0-8.5,0l1.42,1.42a4,4,0,1,1,5.67,5.67l-8,8a4,4,0,1,1-5.67-5.66l1.41-1.42-1.41-1.42-1.42,1.42a6,6,0,0,0,0,8.5A6,6,0,0,0,17,25a6,6,0,0,0,4.27-1.76l8-8A6,6,0,0,0,29.25,6.76Z"}},{elem:"path",attrs:{d:"M4.19,24.82a4,4,0,0,1,0-5.67l8-8a4,4,0,0,1,5.67,0A3.94,3.94,0,0,1,19,14a4,4,0,0,1-1.17,2.85L15.71,19l1.42,1.42,2.12-2.12a6,6,0,0,0-8.51-8.51l-8,8a6,6,0,0,0,0,8.51A6,6,0,0,0,7,28a6.07,6.07,0,0,0,4.28-1.76L9.86,24.82A4,4,0,0,1,4.19,24.82Z"}}],name:"link",size:16},A={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 16 16",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M9.3 3.7L13.1 7.5 1 7.5 1 8.5 13.1 8.5 9.3 12.3 10 13 15 8 10 3z"}}],name:"arrow--right",size:16},g={elem:"svg",attrs:{xmlns:"http://www.w3.org/2000/svg",viewBox:"0 0 16 16",fill:"currentColor",width:16,height:16},content:[{elem:"path",attrs:{d:"M13,14H3c-0.6,0-1-0.4-1-1V3c0-0.6,0.4-1,1-1h5v1H3v10h10V8h1v5C14,13.6,13.6,14,13,14z"}},{elem:"path",attrs:{d:"M10 1L10 2 13.3 2 9 6.3 9.7 7 14 2.7 14 6 15 6 15 1z"}}],name:"launch",size:16};/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */const{expect:S,fn:h}=__STORYBOOK_MODULE_TEST__,_=n`
  <h5 class="heading-01 margin-bottom-04">AI Chat Tile styling wrapper</h5>
  <p class="body-01">
    The Carbon Design System provides a comprehensive library of components,
    tokens, and guidelines. We need to implement the new AI Chat component
    following Carbon's design principles and accessibility standards.
  </p>
`,W="https://live.staticflickr.com/540/18795217173_39e0b63304_c.jpg",P={control:"radio",options:["unset","sm","md","lg"],mapping:{unset:"unset",sm:"291px",md:"438px",lg:"535px"},description:"Sets the max width of the story container. This is a story-only control and does not affect the component itself."},T={"primary danger buttons":e=>n`
    <cds-button @click=${e.onClick} kind="primary">Primary</cds-button>
    <cds-button @click=${e.onClick} kind="danger">Danger</cds-button>
  `,"ghost button with icon":e=>n`
    <cds-button @click=${e.onClick} kind="ghost">
      View carbon docs
      ${p(g,{slot:"icon",style:"fill: var(--cds-link-primary)"})}
    </cds-button>
  `,"secondary button":e=>n`
    <cds-button @click=${e.onClick} kind="secondary">
      Secondary ${p(g,{slot:"icon"})}
    </cds-button>
  `,"3 ghost buttons vertical":e=>n`
    <cds-button @click=${e.onClick} kind="ghost">
      View Carbon Docs 1
      ${p(g,{slot:"icon",style:"fill: var(--cds-link-primary)"})}
    </cds-button>
    <cds-button @click=${e.onClick} kind="ghost">
      View Carbon Docs 2
      ${p(g,{slot:"icon",style:"fill: var(--cds-link-primary)"})}
    </cds-button>
    <cds-button @click=${e.onClick} kind="ghost">
      View Carbon Docs 3
      ${p(g,{slot:"icon",style:"fill: var(--cds-link-primary)"})}
    </cds-button>
  `,"primary button":e=>n`
    <cds-button @click=${e.onClick} kind="primary">Primary</cds-button>
  `,"danger button":e=>n`
    <cds-button @click=${e.onClick} kind="danger">Danger</cds-button>
  `,"ghost button":e=>n`
    <cds-button @click=${e.onClick} kind="ghost"> Ghost </cds-button>
  `,"secondary primary buttons":e=>n`
    <cds-button @click=${e.onClick} kind="secondary">Secondary</cds-button>
    <cds-button @click=${e.onClick} kind="primary">Primary</cds-button>
  `},q={title:"Components/Tile Container",argTypes:{maxWidth:P,useWrapper:{control:"boolean",description:"Toggle rendering inside <cds-aichat-tile-container>"},onClick:{action:"onClick"},layered:{control:"boolean",description:"this is a story only control, add `bg-layer` class on tile to make it layered <a target='_blank' href='https://w3.ibm.com/w3publisher/design-for-ai/carbon-for-ai/ai-chat-patterns/patterns#message-anatomy'>more info on layering</a>"}},args:{layered:!1},decorators:[(e,{args:t})=>n`
      <style>
        ${j}
      </style>
      <div style="max-width: ${t.maxWidth};">
        ${t.useWrapper?n`<cds-aichat-tile-container
              >${e()}</cds-aichat-tile-container
            >`:e()}
      </div>
    `]},k={args:{maxWidth:"sm",useWrapper:!0},render:e=>n`<cds-tile
      class=${l({"bg-layer":e.layered})}
      data-rounded
      >${_}</cds-tile
    >`},f={args:{maxWidth:"sm",useWrapper:!0,footerActions:"primary danger buttons",onClick:h()},argTypes:{footerActions:{control:"select",options:Object.keys(T),mapping:T,description:"Footer button variations"}},render:e=>{const t=e.footerActions(e),i=(t?.strings?.join(" ")?.match(/<cds-button\b/g)||[]).length;return n`
      <cds-tile
        data-rounded
        data-testid="clickable-tile"
        class=${l({"bg-layer":e.layered})}
      >
        ${_}
        ${i!==0?n`<div
              class=${l({"cds-aichat--tile-container-footer":!0,"margin-top-05":!0})}
              ?data-stacked=${i>2}
              data-flush="bottom"
              data-rounded="bottom"
            >
              ${t}
            </div>`:""}
      </cds-tile>
    `}},y={args:{maxWidth:"sm",useWrapper:!0,footerActions:"primary button",onClick:h()},argTypes:{footerActions:{control:"select",options:["primary button","ghost button","none"],mapping:{"primary button":e=>n`
          <cds-button @click=${e.onClick} kind="primary">
            Select ${p(A,{slot:"icon"})}
          </cds-button>
        `,"ghost button":e=>n`
          <cds-button @click=${e.onClick} kind="ghost">
            Select
            ${p(A,{slot:"icon",style:"fill: var(--cds-link-primary)"})}
          </cds-button>
        `,none:()=>""},description:"Footer button variations"}},render:e=>{const t=e.footerActions(e),i=t?.strings?.[0]?.trim().split(`
`).length||0;return n`
      <cds-tile
        data-rounded
        class=${l({"bg-layer":e.layered})}
      >
        <div data-flush="top">
          <img
            data-rounded="top"
            class="margin-bottom-05"
            src=${W}
            alt="image"
          />
        </div>
        ${_}
        ${i!==0?n`<div
              class=${l({"cds-aichat--tile-container-footer":!0,"margin-top-05":!0})}
              data-stacked=${i>2}
              data-flush="bottom"
              data-rounded="bottom"
            >
              ${t}
            </div>`:""}
      </cds-tile>
    `}},v={args:{maxWidth:"sm",useWrapper:!0,onClick:h()},render:e=>n`
    <cds-tile
      data-rounded
      class=${l({"bg-layer":e.layered})}
      ><div data-flush><img data-rounded src=${W} alt="image" /></div
    ></cds-tile>
  `},$={args:{maxWidth:"sm",disabled:!1,useWrapper:!0,onClick:h()},argTypes:{disabled:{control:"boolean",description:"disables the clickable tile"}},render:e=>n`
    <cds-clickable-tile
      class=${l({"bg-layer":e.layered})}
      data-rounded
      @click=${e.onClick}
      ?disabled=${e.disabled}
    >
      <div data-flush><img data-rounded src=${W} alt="image" /></div>
    </cds-clickable-tile>
  `},C={name:"With Audio (iframe)",args:{maxWidth:"sm",useWrapper:!0,onClick:h()},render:e=>n`
    <cds-tile
      class=${l({"bg-layer":e.layered})}
      data-testid="clickable-tile"
      data-rounded
    >
      <div data-flush="top" data-rounded="top" class="margin-bottom-05">
        <iframe
          class="full-width aspect-16-9"
          scrolling="no"
          title="audio example"
          frameborder="no"
          allow="autoplay"
          src="https://w.soundcloud.com/player/?url=https://soundcloud.com/kelab-gklm/baby-shark-do-do-do&visual=true&buying=false&liking=false&download=false&sharing=false&show_comments=false&show_playcount=false&callback=true"
        ></iframe>
      </div>
      <h5 class="body-02">An audio clip from SoundCloud</h5>
      <p class="caption-01 text-secondary">
        This description and the title above are optional.
      </p>
    </cds-tile>
  `},w={args:{maxWidth:"md",useWrapper:!0,onClick:h()},render:e=>n`
    <cds-tile
      class=${l({"bg-layer":e.layered})}
      data-rounded
      data-testid="clickable-tile"
    >
      <div data-rounded data-flush>
        <iframe
          class="full-width aspect-16-9"
          src="https://www.youtube.com/embed/QuW4_bRHbUk?si=oSsaxYKCvO_gEuzN"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </cds-tile>
  `},x={play:async({canvas:e,userEvent:t,args:i})=>{const c=e.getByTestId("clickable-tile"),d=c.shadowRoot.querySelector(".cds--tile--clickable");await t.click(d),S(i.onClick).toHaveBeenCalled(),await t.click(document.body),S(c).not.toHaveFocus()},args:{maxWidth:"sm",useWrapper:!0,onClick:h()},render:e=>n`
    <cds-clickable-tile
      class=${l({"bg-layer":e.layered})}
      data-rounded
      @click=${e.onClick}
      data-testid="clickable-tile"
    >
      ${_}
      <br />
      <div
        class="link-secondary"
        style="display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;"
      >
        <span
          style="display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
        >
          Lorem ipsum dolor sit, amet consectetur adipisicing.
        </span>
        ${p(K,{style:"flex: none;"})}
      </div>
    </cds-clickable-tile>
  `};k.parameters={...k.parameters,docs:{...k.parameters?.docs,source:{originalSource:`{
  args: {
    maxWidth: "sm",
    useWrapper: true
  },
  render: args => html\`<cds-tile
      class=\${classMap({
    "bg-layer": args.layered
  })}
      data-rounded
      >\${tileContent}</cds-tile
    >\`
}`,...k.parameters?.docs?.source}}};f.parameters={...f.parameters,docs:{...f.parameters?.docs,source:{originalSource:`{
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerActions: "primary danger buttons",
    onClick: fn()
  },
  argTypes: {
    footerActions: {
      control: "select",
      options: Object.keys(footerActionVariants),
      mapping: footerActionVariants,
      description: "Footer button variations"
    }
  },
  render: args => {
    const footerActions = args.footerActions(args);
    const buttonCount = (footerActions?.strings?.join(" ")?.match(/<cds-button\\b/g) || []).length;
    return html\`
      <cds-tile
        data-rounded
        data-testid="clickable-tile"
        class=\${classMap({
      "bg-layer": args.layered
    })}
      >
        \${tileContent}
        \${buttonCount !== 0 ? html\`<div
              class=\${classMap({
      "cds-aichat--tile-container-footer": true,
      "margin-top-05": true
    })}
              ?data-stacked=\${buttonCount > 2}
              data-flush="bottom"
              data-rounded="bottom"
            >
              \${footerActions}
            </div>\` : ""}
      </cds-tile>
    \`;
  }
}`,...f.parameters?.docs?.source}}};y.parameters={...y.parameters,docs:{...y.parameters?.docs,source:{originalSource:`{
  args: {
    maxWidth: "sm",
    useWrapper: true,
    footerActions: "primary button",
    onClick: fn()
  },
  argTypes: {
    footerActions: {
      control: "select",
      options: ["primary button", "ghost button", "none"],
      mapping: {
        "primary button": args => html\`
          <cds-button @click=\${args.onClick} kind="primary">
            Select \${iconLoader(ArrowRight16, {
          slot: "icon"
        })}
          </cds-button>
        \`,
        "ghost button": args => html\`
          <cds-button @click=\${args.onClick} kind="ghost">
            Select
            \${iconLoader(ArrowRight16, {
          slot: "icon",
          style: "fill: var(--cds-link-primary)"
        })}
          </cds-button>
        \`,
        none: () => ""
      },
      description: "Footer button variations"
    }
  },
  render: args => {
    const footerActions = args.footerActions(args);
    const buttonCount = footerActions?.strings?.[0]?.trim().split("\\n").length || 0;
    return html\`
      <cds-tile
        data-rounded
        class=\${classMap({
      "bg-layer": args.layered
    })}
      >
        <div data-flush="top">
          <img
            data-rounded="top"
            class="margin-bottom-05"
            src=\${defaultImage}
            alt="image"
          />
        </div>
        \${tileContent}
        \${buttonCount !== 0 ? html\`<div
              class=\${classMap({
      "cds-aichat--tile-container-footer": true,
      "margin-top-05": true
    })}
              data-stacked=\${buttonCount > 2}
              data-flush="bottom"
              data-rounded="bottom"
            >
              \${footerActions}
            </div>\` : ""}
      </cds-tile>
    \`;
  }
}`,...y.parameters?.docs?.source}}};v.parameters={...v.parameters,docs:{...v.parameters?.docs,source:{originalSource:`{
  args: {
    maxWidth: "sm",
    useWrapper: true,
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      data-rounded
      class=\${classMap({
    "bg-layer": args.layered
  })}
      ><div data-flush><img data-rounded src=\${defaultImage} alt="image" /></div
    ></cds-tile>
  \`
}`,...v.parameters?.docs?.source}}};$.parameters={...$.parameters,docs:{...$.parameters?.docs,source:{originalSource:`{
  args: {
    maxWidth: "sm",
    disabled: false,
    useWrapper: true,
    onClick: fn()
  },
  argTypes: {
    disabled: {
      control: "boolean",
      description: "disables the clickable tile"
    }
  },
  render: args => html\`
    <cds-clickable-tile
      class=\${classMap({
    "bg-layer": args.layered
  })}
      data-rounded
      @click=\${args.onClick}
      ?disabled=\${args.disabled}
    >
      <div data-flush><img data-rounded src=\${defaultImage} alt="image" /></div>
    </cds-clickable-tile>
  \`
}`,...$.parameters?.docs?.source}}};C.parameters={...C.parameters,docs:{...C.parameters?.docs,source:{originalSource:`{
  name: "With Audio (iframe)",
  args: {
    maxWidth: "sm",
    useWrapper: true,
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      class=\${classMap({
    "bg-layer": args.layered
  })}
      data-testid="clickable-tile"
      data-rounded
    >
      <div data-flush="top" data-rounded="top" class="margin-bottom-05">
        <iframe
          class="full-width aspect-16-9"
          scrolling="no"
          title="audio example"
          frameborder="no"
          allow="autoplay"
          src="https://w.soundcloud.com/player/?url=https://soundcloud.com/kelab-gklm/baby-shark-do-do-do&visual=true&buying=false&liking=false&download=false&sharing=false&show_comments=false&show_playcount=false&callback=true"
        ></iframe>
      </div>
      <h5 class="body-02">An audio clip from SoundCloud</h5>
      <p class="caption-01 text-secondary">
        This description and the title above are optional.
      </p>
    </cds-tile>
  \`
}`,...C.parameters?.docs?.source}}};w.parameters={...w.parameters,docs:{...w.parameters?.docs,source:{originalSource:`{
  args: {
    maxWidth: "md",
    useWrapper: true,
    onClick: fn()
  },
  render: args => html\`
    <cds-tile
      class=\${classMap({
    "bg-layer": args.layered
  })}
      data-rounded
      data-testid="clickable-tile"
    >
      <div data-rounded data-flush>
        <iframe
          class="full-width aspect-16-9"
          src="https://www.youtube.com/embed/QuW4_bRHbUk?si=oSsaxYKCvO_gEuzN"
          title="YouTube video player"
          frameborder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen
        ></iframe>
      </div>
    </cds-tile>
  \`
}`,...w.parameters?.docs?.source}}};x.parameters={...x.parameters,docs:{...x.parameters?.docs,source:{originalSource:`{
  // https://storybook.js.org/docs/writing-tests/interaction-testing
  play: async ({
    canvas,
    userEvent,
    args
  }) => {
    const tile = canvas.getByTestId("clickable-tile");
    const tileTrigger = tile.shadowRoot.querySelector(".cds--tile--clickable");
    await userEvent.click(tileTrigger);
    expect(args.onClick).toHaveBeenCalled();
    await userEvent.click(document.body);
    expect(tile).not.toHaveFocus();
  },
  args: {
    maxWidth: "sm",
    useWrapper: true,
    onClick: fn()
  },
  render: args => html\`
    <cds-clickable-tile
      class=\${classMap({
    "bg-layer": args.layered
  })}
      data-rounded
      @click=\${args.onClick}
      data-testid="clickable-tile"
    >
      \${tileContent}
      <br />
      <div
        class="link-secondary"
        style="display: flex; justify-content: space-between; align-items: center; gap: 0.6rem;"
      >
        <span
          style="display: block; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;"
        >
          Lorem ipsum dolor sit, amet consectetur adipisicing.
        </span>
        \${iconLoader(Link16, {
    style: "flex: none;"
  })}
      </div>
    </cds-clickable-tile>
  \`
}`,...x.parameters?.docs?.source}}};const G=["Default","WithActions","WithImage","OnlyImage","OnlyImageClickable","WithAudio","OnlyVideo","Clickable"],ie=Object.freeze(Object.defineProperty({__proto__:null,Clickable:x,Default:k,OnlyImage:v,OnlyImageClickable:$,OnlyVideo:w,WithActions:f,WithAudio:C,WithImage:y,__namedExportsOrder:G,default:q},Symbol.toStringTag,{value:"Module"}));export{ie as T};
