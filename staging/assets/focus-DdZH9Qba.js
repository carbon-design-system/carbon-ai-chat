import{E as f,T as v}from"./iframe-9E7wC2q2.js";import{i as y,t as w,e as x}from"./directive-gBWAn9fs.js";function F(t,e,r,i){var o=arguments.length,s=o<3?e:i===null?i=Object.getOwnPropertyDescriptor(e,r):i,c;if(typeof Reflect=="object"&&typeof Reflect.decorate=="function")s=Reflect.decorate(t,e,r,i);else for(var u=t.length-1;u>=0;u--)(c=t[u])&&(s=(o<3?c(s):o>3?c(e,r,s):c(e,r))||s);return o>3&&s&&Object.defineProperty(e,r,s),s}/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const G=t=>t??f,n="cds",p=`
  a[href]:not(#start-sentinel, #end-sentinel), area[href], input:not([disabled]):not([tabindex='-1']),
  button:not([disabled]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),
  textarea:not([disabled]):not([tabindex='-1']),
  iframe, object, embed, *[tabindex]:not([tabindex='-1']), *[contenteditable=true],
  ${n}-accordion-item,
  ${n}-actionable-notification-button,
  ${n}-button,
  ${n}-breadcrumb-link,
  ${n}-checkbox,
  ${n}-code-snippet,
  ${n}-combo-box,
  ${n}-content-switcher-item,
  ${n}-copy-button,
  ${n}-table-header-row,
  ${n}-table-row,
  ${n}-table-toolbar-search,
  ${n}-date-picker-input,
  ${n}-dropdown,
  ${n}-icon-button,
  ${n}-input,
  ${n}-link,
  ${n}-number-input,
  ${n}-modal,
  ${n}-modal-close-button,
  ${n}-multi-select,
  ${n}-inline-notification,
  ${n}-toast-notification,
  ${n}-overflow-menu,
  ${n}-overflow-menu-item,
  ${n}-page-sizes-select,
  ${n}-pages-select,
  ${n}-progress-step,
  ${n}-radio-button,
  ${n}-search,
  ${n}-slider,
  ${n}-slider-input,
  ${n}-structured-list,
  ${n}-tab,
  ${n}-filter-tag,
  ${n}-textarea,
  ${n}-text-input,
  ${n}-clickable-tile,
  ${n}-expandable-tile,
  ${n}-radio-tile,
  ${n}-selectable-tile,
  ${n}-toggle,
  ${n}-tooltip,
  ${n}-tooltip-definition,
  ${n}-tooltip-icon,
  ${n}-header-menu,
  ${n}-header-menu-button,
  ${n}-header-menu-item,
  ${n}-header-name,
  ${n}-header-nav-item,
  ${n}-side-nav-link,
  ${n}-side-nav-menu,
  ${n}-side-nav-menu-item,
  ${n}-slug
`;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class d extends y{constructor(e){if(super(e),this.it=f,e.type!==w.CHILD)throw Error(this.constructor.directiveName+"() can only be used in child bindings")}render(e){if(e===f||e==null)return this._t=void 0,this.it=e;if(e===v)return e;if(typeof e!="string")throw Error(this.constructor.directiveName+"() called with a non-string value");if(e===this.it)return this._t;this.it=e;const r=[e];return r.raw=r,this._t={_$litType$:this.constructor.resultType,strings:r,values:[]}}}d.directiveName="unsafeHTML",d.resultType=1;/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */class b extends d{}b.directiveName="unsafeSVG",b.resultType=2;const O=x(b);function m(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var i=Object.getOwnPropertySymbols(t);e&&(i=i.filter(function(o){return Object.getOwnPropertyDescriptor(t,o).enumerable})),r.push.apply(r,i)}return r}function l(t){for(var e=1;e<arguments.length;e++){var r=arguments[e]!=null?arguments[e]:{};e%2?m(Object(r),!0).forEach(function(i){j(t,i,r[i])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):m(Object(r)).forEach(function(i){Object.defineProperty(t,i,Object.getOwnPropertyDescriptor(r,i))})}return t}function j(t,e,r){return e=_(e),e in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}function P(t,e){if(t==null)return{};var r={},i=Object.keys(t),o,s;for(s=0;s<i.length;s++)o=i[s],!(e.indexOf(o)>=0)&&(r[o]=t[o]);return r}function $(t,e){if(t==null)return{};var r=P(t,e),i,o;if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(t);for(o=0;o<s.length;o++)i=s[o],!(e.indexOf(i)>=0)&&Object.prototype.propertyIsEnumerable.call(t,i)&&(r[i]=t[i])}return r}function S(t,e){if(typeof t!="object"||t===null)return t;var r=t[Symbol.toPrimitive];if(r!==void 0){var i=r.call(t,e);if(typeof i!="object")return i;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function _(t){var e=S(t,"string");return typeof e=="symbol"?e:String(e)}var E=["width","height","viewBox"],T=["tabindex"],A={focusable:"false",preserveAspectRatio:"xMidYMid meet"};function D(){var t=arguments.length>0&&arguments[0]!==void 0?arguments[0]:{},e=t.width,r=t.height,i=t.viewBox,o=i===void 0?"0 0 ".concat(e," ").concat(r):i,s=$(t,E),c=s.tabindex,u=$(s,T),a=l(l(l({},A),u),{},{width:e,height:r,viewBox:o});return a["aria-label"]||a["aria-labelledby"]||a.title?(a.role="img",c!=null&&(a.focusable="true",a.tabindex=c)):a["aria-hidden"]=!0,a}function h(t){return Object.keys(t).reduce(function(e,r,i){var o="".concat(r,'="').concat(t[r],'"');return i===0?o:e+" "+o},"")}function R(t){return"default"in t&&t.default?t.default:t}function B(t,e={}){const r=R(t);r.attrs||(r.attrs={});const i=Object.assign(Object.assign({},r.attrs),e),o=D(i),s=h(o),u=(r.content||[]).map(a=>typeof a=="string"?a:g(a)).join("");return`<svg ${s}>${u}</svg>`}function g(t){if(typeof t=="string")return t;const{elem:e="svg",attrs:r={},content:i=[]}=t,o=i.map(g).join(""),s=h(r);return`<${e} ${s}>${o}</${e}>`}function I(t){return(e={})=>{const r=B(t,e);return O(r)}}function V(t,e={},r){return t?"default"in t||"attrs"in t&&"content"in t?I(t)(e):t:null}const L=(t,e)=>{try{customElements.define(t,e)}catch{console.warn(`Attempting to re-define ${t}`)}return e},M=(t,e)=>{const{kind:r,elements:i}=e;return{kind:r,elements:i,finisher(o){try{customElements.define(t,o)}catch{console.warn(`Attempting to re-define ${t}`)}}}},q=t=>e=>typeof e=="function"?L(t,e):M(t,e),H=t=>class extends t{focus(){if(this.shadowRoot.delegatesFocus)super.focus();else{const e=this.shadowRoot.querySelector(p)||this.querySelector(p);e?e.focus():super.focus()}}};export{H as F,F as _,q as c,V as i,G as o,n as p};
