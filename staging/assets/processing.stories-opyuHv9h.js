import{a as p,i as u,b as d}from"./iframe-9E7wC2q2.js";import{e as b,t as y,p as k}from"./settings-DVjgF8qf.js";import{n as f}from"./directive-gBWAn9fs.js";const v=`/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */html,body,div,span,applet,object,iframe,h1,h2,h3,h4,h5,h6,p,blockquote,pre,a,abbr,acronym,address,big,cite,code,del,dfn,em,img,ins,kbd,q,s,samp,small,strike,strong,sub,sup,tt,var,b,u,i,center,dl,dt,dd,ol,ul,li,fieldset,form,label,legend,table,caption,tbody,tfoot,thead,tr,th,td,article,aside,canvas,details,embed,figure,figcaption,footer,header,hgroup,menu,nav,output,ruby,section,summary,time,mark,audio,video{padding:0;border:0;margin:0;font:inherit;font-feature-settings:"liga" 1;font-size:100%;vertical-align:baseline}button,select,input,textarea{border-radius:0;font-family:inherit}article,aside,details,figcaption,figure,footer,header,hgroup,menu,nav,section{display:block}body{background-color:var(--cds-background, #ffffff);color:var(--cds-text-primary, #161616);line-height:1}ol,ul{list-style:none}blockquote,q{quotes:none}blockquote:before,blockquote:after,q:before,q:after{content:none}table{border-collapse:collapse;border-spacing:0}html{box-sizing:border-box}*,*:before,*:after{box-sizing:inherit}html{font-size:100%}body{font-weight:400;font-family:IBM Plex Sans,system-ui,-apple-system,BlinkMacSystemFont,".SFNSText-Regular",sans-serif;-moz-osx-font-smoothing:grayscale;-webkit-font-smoothing:antialiased;text-rendering:optimizeLegibility}code{font-family:IBM Plex Mono,system-ui,-apple-system,BlinkMacSystemFont,".SFNSText-Regular",monospace}strong{font-weight:600}@media screen and (-ms-high-contrast:active){svg{fill:ButtonText}}h1{font-size:var(--cds-heading-06-font-size, 2.625rem);font-weight:var(--cds-heading-06-font-weight, 300);line-height:var(--cds-heading-06-line-height, 1.199);letter-spacing:var(--cds-heading-06-letter-spacing, 0)}h2{font-size:var(--cds-heading-05-font-size, 2rem);font-weight:var(--cds-heading-05-font-weight, 400);line-height:var(--cds-heading-05-line-height, 1.25);letter-spacing:var(--cds-heading-05-letter-spacing, 0)}h3{font-size:var(--cds-heading-04-font-size, 1.75rem);font-weight:var(--cds-heading-04-font-weight, 400);line-height:var(--cds-heading-04-line-height, 1.28572);letter-spacing:var(--cds-heading-04-letter-spacing, 0)}h4{font-size:var(--cds-heading-03-font-size, 1.25rem);font-weight:var(--cds-heading-03-font-weight, 400);line-height:var(--cds-heading-03-line-height, 1.4);letter-spacing:var(--cds-heading-03-letter-spacing, 0)}h5{font-size:var(--cds-heading-02-font-size, 1rem);font-weight:var(--cds-heading-02-font-weight, 600);line-height:var(--cds-heading-02-line-height, 1.5);letter-spacing:var(--cds-heading-02-letter-spacing, 0)}h6{font-size:var(--cds-heading-01-font-size, .875rem);font-weight:var(--cds-heading-01-font-weight, 600);line-height:var(--cds-heading-01-line-height, 1.42857);letter-spacing:var(--cds-heading-01-letter-spacing, .16px)}p{font-size:var(--cds-body-02-font-size, 1rem);font-weight:var(--cds-body-02-font-weight, 400);line-height:var(--cds-body-02-line-height, 1.5);letter-spacing:var(--cds-body-02-letter-spacing, 0)}a{color:var(--cds-link-primary, #0062fe)}em{font-style:italic}.dots{block-size:32px;inline-size:32px}.dot{fill:none;r:0;stroke:var(--cds-interactive, #0f62fe);stroke-width:0;transform:translateY(0)}[data-carbon-theme=white] .dot,[data-carbon-theme=g10] .dot{stroke:var(--cds-interactive, #0f62fe)}[data-carbon-theme=g90] .dot,[data-carbon-theme=g100] .dot{stroke:var(--cds-text-secondary, #525252)}@media screen and (prefers-reduced-motion:reduce){.linear .dot--left{animation:none;animation-delay:1s,1s,2s,2s;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1,1,infinite,infinite;transform-origin:25% 50%}}.linear .dot--left{animation:linear-load-size,linear-load-stroke,linear-loop-size,linear-loop-stroke;animation-delay:1s,1s,2s,2s;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1,1,infinite,infinite;transform-origin:25% 50%}@media screen and (prefers-reduced-motion:reduce){.linear .dot--center{animation:none;animation-delay:1167ms,1167ms,2167ms,2167ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1,1,infinite,infinite;transform-origin:50% 50%}}.linear .dot--center{animation:linear-load-size,linear-load-stroke,linear-loop-size,linear-loop-stroke;animation-delay:1167ms,1167ms,2167ms,2167ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1,1,infinite,infinite;transform-origin:50% 50%}@media screen and (prefers-reduced-motion:reduce){.linear .dot--right{animation:none;animation-delay:1334ms,1334ms,2334ms,2334ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1,1,infinite,infinite;transform-origin:75% 50%}}.linear .dot--right{animation:linear-load-size,linear-load-stroke,linear-loop-size,linear-loop-stroke;animation-delay:1334ms,1334ms,2334ms,2334ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1,1,infinite,infinite;transform-origin:75% 50%}@media screen and (prefers-reduced-motion:reduce){.linear--no-loop .dot--left{animation:none;animation-delay:1s,1s,2s,2s;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1;transform-origin:25% 50%}}.linear--no-loop .dot--left{animation:linear-load-size,linear-load-stroke,linear-unload-size,linear-unload-stroke;animation-delay:1s,1s,2s,2s;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1;transform-origin:25% 50%}@media screen and (prefers-reduced-motion:reduce){.linear--no-loop .dot--center{animation:none;animation-delay:1167ms,1167ms,2167ms,2167ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1;transform-origin:50% 50%}}.linear--no-loop .dot--center{animation:linear-load-size,linear-load-stroke,linear-unload-size,linear-unload-stroke;animation-delay:1167ms,1167ms,2167ms,2167ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1;transform-origin:50% 50%}@media screen and (prefers-reduced-motion:reduce){.linear--no-loop .dot--right{animation:none;animation-delay:1334ms,1334ms,2334ms,2334ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1;transform-origin:75% 50%}}.linear--no-loop .dot--right{animation:linear-load-size,linear-load-stroke,linear-unload-size,linear-unload-stroke;animation-delay:1334ms,1334ms,2334ms,2334ms;animation-duration:1s;animation-fill-mode:forwards;animation-iteration-count:1;transform-origin:75% 50%}[dir=rtl] .linear .dot--left{animation-delay:1334ms,1334ms,2334ms,2334ms,7334ms,7334ms}[dir=rtl] .linear .dot--center{animation-delay:1167ms,1167ms,2167ms,2167ms,7167ms,7167ms}[dir=rtl] .linear .dot--right{animation-delay:1s,1s,2s,2s,7s,7s}[dir=rtl] .linear--no-loop .dot--left{animation-delay:1334ms,1334ms,2334ms,2334ms}[dir=rtl] .linear--no-loop .dot--center{animation-delay:1167ms,1167ms,2167ms,2167ms}[dir=rtl] .linear--no-loop .dot--right{animation-delay:1s,1s,2s,2s}@keyframes linear-load-size{0%{animation-timing-function:cubic-bezier(0,0,.3,1);r:0}25%{animation-timing-function:cubic-bezier(0,0,.3,1);r:2.5px}83.3%{r:.875px}to{r:.875px}}@keyframes linear-load-stroke{0%{animation-timing-function:cubic-bezier(0,0,.3,1);stroke-width:0}8.33%{stroke-width:1.72}to{stroke-width:1.72}}@keyframes linear-loop-size{0%{animation-timing-function:cubic-bezier(0,0,.3,1);r:.875px}25%{animation-timing-function:cubic-bezier(0,0,.3,1);r:2.5px}91.66%{r:.875px}to{r:.875px}}@keyframes linear-loop-stroke{0%{animation-timing-function:cubic-bezier(.4,.14,1,1);stroke-width:1.72}to{stroke-width:1.72}}@keyframes linear-unload-size{0%{r:.875px}8.33%{r:.875px}33.33%{animation-timing-function:cubic-bezier(.4,.14,1,1);r:2.5px}58.33%{r:0}to{r:0}}@keyframes linear-unload-stroke{0%{stroke-width:1.72}50%{stroke-width:1.72}58.33%{stroke-width:0}to{stroke-width:0}}@media(prefers-reduced-motion:reduce){.dot--left,.dot--center,.dot--right{animation:none;transition:none}}`,z=p(v);var w=Object.defineProperty,T=Object.getOwnPropertyDescriptor,l=(e,r,c,s)=>{for(var i=s>1?void 0:s?T(r,c):r,m=e.length-1,g;m>=0;m--)(g=e[m])&&(i=(s?g(r,c,i):g(i))||i);return s&&i&&w(r,c,i),i};let n=class extends u{constructor(){super(...arguments),this.loop=!1,this.quickLoad=!1,this.carbonTheme="g10"}render(){const e=b({"quick-load":this.quickLoad===!0,linear:this.loop===!0,"linear--no-loop":this.loop===!1});return d`<div data-carbon-theme=${this.carbonTheme} class=${e}>
      <svg class="dots" viewBox="0 0 32 32">
        <circle class="dot dot--left" cx="8" cy="16" />
        <circle class="dot dot--center" cx="16" cy="16" r="2" />
        <circle class="dot dot--right" cx="24" cy="16" r="2" />
      </svg>
    </div>`}};n.styles=z;l([f({type:Boolean})],n.prototype,"loop",2);l([f({type:Boolean})],n.prototype,"quickLoad",2);l([f({type:String})],n.prototype,"carbonTheme",2);n=l([y(`${k}-processing`)],n);/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */const x={title:"Components/Processing"},h={loop:Boolean,quickLoad:Boolean,carbonTheme:{control:{type:"select"},options:["g100","g90","g10","white"]}},o={args:{quickLoad:!0,carbonTheme:"g10"},argTypes:h,render:e=>d`<cds-aichat-processing
      ?quickLoad=${e.quickLoad}
      ?loop=${e.loop}
      carbonTheme=${e.carbonTheme}
    />`},a={args:{loop:!0,carbonTheme:"g10"},argTypes:h,render:e=>d`<cds-aichat-processing
      ?quickLoad=${e.quickLoad}
      ?loop=${e.loop}
      carbonTheme=${e.carbonTheme}
    />`},t={args:{loop:!1,carbonTheme:"g10"},argTypes:h,render:e=>d` <cds-aichat-processing
      ?quickLoad=${e.quickLoad}
      ?loop=${e.loop}
      carbonTheme=${e.carbonTheme}
    />`};o.parameters={...o.parameters,docs:{...o.parameters?.docs,source:{originalSource:`{
  args: {
    quickLoad: true,
    carbonTheme: "g10"
  },
  argTypes: argTypes,
  render: args => html\`<cds-aichat-processing
      ?quickLoad=\${args.quickLoad}
      ?loop=\${args.loop}
      carbonTheme=\${args.carbonTheme}
    />\`
}`,...o.parameters?.docs?.source}}};a.parameters={...a.parameters,docs:{...a.parameters?.docs,source:{originalSource:`{
  args: {
    loop: true,
    carbonTheme: "g10"
  },
  argTypes: argTypes,
  render: args => html\`<cds-aichat-processing
      ?quickLoad=\${args.quickLoad}
      ?loop=\${args.loop}
      carbonTheme=\${args.carbonTheme}
    />\`
}`,...a.parameters?.docs?.source}}};t.parameters={...t.parameters,docs:{...t.parameters?.docs,source:{originalSource:`{
  args: {
    loop: false,
    carbonTheme: "g10"
  },
  argTypes: argTypes,
  render: args => {
    return html\` <cds-aichat-processing
      ?quickLoad=\${args.quickLoad}
      ?loop=\${args.loop}
      carbonTheme=\${args.carbonTheme}
    />\`;
  }
}`,...t.parameters?.docs?.source}}};const L=["QuickLoad","LinearLoop","LinearNoLoop"],_=Object.freeze(Object.defineProperty({__proto__:null,LinearLoop:a,LinearNoLoop:t,QuickLoad:o,__namedExportsOrder:L,default:x},Symbol.toStringTag,{value:"Module"}));export{_ as P};
