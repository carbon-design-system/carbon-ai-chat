import{f as u,u as h}from"./iframe-9E7wC2q2.js";/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const l={attribute:!0,type:String,converter:h,reflect:!1,hasChanged:u},p=(r=l,t,e)=>{const{kind:s,metadata:a}=e;let n=globalThis.litPropertyMetadata.get(a);if(n===void 0&&globalThis.litPropertyMetadata.set(a,n=new Map),s==="setter"&&((r=Object.create(r)).wrapped=!0),n.set(e.name,r),s==="accessor"){const{name:i}=e;return{set(o){const c=t.get.call(this);t.set.call(this,o),this.requestUpdate(i,c,r)},init(o){return o!==void 0&&this.C(i,void 0,r,o),o}}}if(s==="setter"){const{name:i}=e;return function(o){const c=this[i];t.call(this,o),this.requestUpdate(i,c,r)}}throw Error("Unsupported decorator location: "+s)};function $(r){return(t,e)=>typeof e=="object"?p(r,t,e):((s,a,n)=>{const i=a.hasOwnProperty(n);return a.constructor.createProperty(n,s),i?Object.getOwnPropertyDescriptor(a,n):void 0})(r,t,e)}/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */const f={ATTRIBUTE:1,CHILD:2},_=r=>(...t)=>({_$litDirective$:r,values:t});class g{constructor(t){}get _$AU(){return this._$AM._$AU}_$AT(t,e,s){this._$Ct=t,this._$AM=e,this._$Ci=s}_$AS(t,e){return this.update(t,e)}update(t,e){return this.render(...e)}}export{_ as e,g as i,$ as n,f as t};
