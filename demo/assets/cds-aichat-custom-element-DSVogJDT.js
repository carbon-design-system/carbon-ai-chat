import{a as e,s as t,t as n}from"./client-DXX7A8Es.js";import{At as r,Et as i,Tt as a,_n as o,dn as s,fn as c,jt as l,r as u,t as d}from"./chat.cds-aichat-container-B6OI7Oi4.js";import{t as f}from"./chat.react-dom-renderer-CL3ZRytD.js";var p=t({__cds_aichat_container_register:()=>d,default:()=>g});e(),n();var m;f();var h=m=class extends u{constructor(){super(...arguments),this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._pluginSlotNames=[],this._mountHandlers=[],this.defaultViewChangeHandler=e=>{e.newViewState.mainWindow?this.classList.remove(`cds-aichat--hidden`):this.classList.add(`cds-aichat--hidden`)},this.userDefinedHandler=e=>{let{slot:t}=e.data;this._userDefinedSlotNames.includes(t)||(this._userDefinedSlotNames=[...this._userDefinedSlotNames,t])},this.customFooterHandler=e=>{let{slotName:t}=e.data;this._customFooterSlotNames.includes(t)||(this._customFooterSlotNames=[...this._customFooterSlotNames,t])},this.pluginHostController=a(this,{onSlotNamesChange:e=>{this._pluginSlotNames=e}}),this.onBeforeRenderOverride=async e=>{this._instance&&this.releaseMount(),this._instance=e,this.onViewPreChange&&this.subscribe({type:l.VIEW_PRE_CHANGE,handler:this.onViewPreChange}),this.subscribe({type:l.VIEW_CHANGE,handler:this.onViewChange||this.defaultViewChangeHandler}),this.renderUserDefinedResponse||(this.subscribe({type:l.USER_DEFINED_RESPONSE,handler:this.userDefinedHandler}),this.subscribe({type:l.CHUNK_USER_DEFINED_RESPONSE,handler:this.userDefinedHandler})),this.renderCustomMessageFooter||this.subscribe({type:l.CUSTOM_FOOTER_SLOT,handler:this.customFooterHandler}),this.addWriteableElementSlots(),await this.onBeforeRender?.(e)}}createRenderRoot(){let e=super.createRenderRoot();return m.hideSheet&&(e.adoptedStyleSheets=[...e.adoptedStyleSheets,m.hideSheet]),e}connectedCallback(){super.connectedCallback(),this.pluginHostController.connect()}disconnectedCallback(){this.pluginHostController.disconnect(),queueMicrotask(()=>{this.isConnected||this.releaseMount()}),super.disconnectedCallback()}releaseMount(){this._instance?.off(this._mountHandlers),this._mountHandlers=[],this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._instance=void 0}subscribe(e){this._mountHandlers.push(e),this._instance.on(e)}addWriteableElementSlots(){this._writeableElementSlots=Object.keys(this._instance.writeableElements)}render(){return o`
      <cds-aichat-container
        .config=${this.resolvedConfig}
        .header=${this.resolvedConfig.header}
        .onAfterRender=${this.onAfterRender}
        .onBeforeRender=${this.onBeforeRenderOverride}
        .element=${this}
        .renderUserDefinedResponse=${this.renderUserDefinedResponse}
        .renderCustomMessageFooter=${this.renderCustomMessageFooter}
        .renderCustomRequestFooter=${this.renderCustomRequestFooter}
        .renderUserDefinedInputNode=${this.renderUserDefinedInputNode}>
        ${this._writeableElementSlots.map(e=>o`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderUserDefinedResponse?null:this._userDefinedSlotNames.map(e=>o`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderCustomMessageFooter?null:this._customFooterSlotNames.map(e=>o`<div slot=${e}><slot name=${e}></slot></div>`)}
        ${this._pluginSlotNames.map(e=>o`<slot name=${e} slot=${e}></slot>`)}
      </cds-aichat-container>
    `}};h.hideSheet=typeof CSSStyleSheet>`u`?void 0:new CSSStyleSheet,m.hideSheet?.replaceSync?.(`
      :host {
        display: block;
      }
      :host(.cds-aichat--hidden) {
        inline-size: 0 !important;
        block-size: 0 !important;
        min-inline-size: 0 !important;
        min-block-size: 0 !important;
        max-inline-size: 0 !important;
        max-block-size: 0 !important;
        overflow: hidden !important;
        display: block !important;
      }
    `),r([c({attribute:!1})],h.prototype,`onBeforeRender`,void 0),r([c({attribute:!1})],h.prototype,`onAfterRender`,void 0),r([c()],h.prototype,`onViewPreChange`,void 0),r([c()],h.prototype,`onViewChange`,void 0),r([c({attribute:!1})],h.prototype,`renderUserDefinedResponse`,void 0),r([c({attribute:!1})],h.prototype,`renderCustomMessageFooter`,void 0),r([c({attribute:!1})],h.prototype,`renderCustomRequestFooter`,void 0),r([c({attribute:!1})],h.prototype,`renderUserDefinedInputNode`,void 0),r([s()],h.prototype,`_userDefinedSlotNames`,void 0),r([s()],h.prototype,`_writeableElementSlots`,void 0),r([s()],h.prototype,`_customFooterSlotNames`,void 0),r([s()],h.prototype,`_pluginSlotNames`,void 0),r([s()],h.prototype,`_instance`,void 0),h=m=r([i(`cds-aichat-custom-element`)],h);var g=h;export{p as t};