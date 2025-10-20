import{T as r}from"./iframe-9E7wC2q2.js";import{e as o,i as a,t as d}from"./directive-gBWAn9fs.js";/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const l=s=>(e,n)=>{n!==void 0?n.addInitializer((()=>{customElements.define(s,e)})):customElements.define(s,e)};/**
 * @license
 * Copyright 2018 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const f=o(class extends a{constructor(s){if(super(s),s.type!==d.ATTRIBUTE||s.name!=="class"||s.strings?.length>2)throw Error("`classMap()` can only be used in the `class` attribute and must be the only part in the attribute.")}render(s){return" "+Object.keys(s).filter((e=>s[e])).join(" ")+" "}update(s,[e]){if(this.st===void 0){this.st=new Set,s.strings!==void 0&&(this.nt=new Set(s.strings.join(" ").split(/\s/).filter((t=>t!==""))));for(const t in e)e[t]&&!this.nt?.has(t)&&this.st.add(t);return this.render(e)}const n=s.element.classList;for(const t of this.st)t in e||(n.remove(t),this.st.delete(t));for(const t in e){const i=!!e[t];i===this.st.has(t)||this.nt?.has(t)||(i?(n.add(t),this.st.add(t)):(n.remove(t),this.st.delete(t)))}return r}});/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */const m="cds-aichat";export{f as e,m as p,l as t};
