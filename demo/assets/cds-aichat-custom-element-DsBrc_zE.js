import{i as e,s as t,t as n}from"./client-BzRcmYfE.js";import{Ct as r,Ot as i,hn as a,kt as o,ln as s,r as c,t as l,un as u,wt as d}from"./chat.cds-aichat-container-D4Hlkobw.js";import{t as f}from"./chat.react-dom-renderer-DLlaYwg1.js";var p=t({__cds_aichat_container_register:()=>l,default:()=>g});e(),n();var m;f();var h=m=class extends c{constructor(){super(...arguments),this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._pluginSlotNames=[],this._mountHandlers=[],this.defaultViewChangeHandler=e=>{e.newViewState.mainWindow?this.classList.remove(`cds-aichat--hidden`):this.classList.add(`cds-aichat--hidden`)},this.userDefinedHandler=e=>{let{slot:t}=e.data;this._userDefinedSlotNames.includes(t)||(this._userDefinedSlotNames=[...this._userDefinedSlotNames,t])},this.customFooterHandler=e=>{let{slotName:t}=e.data;this._customFooterSlotNames.includes(t)||(this._customFooterSlotNames=[...this._customFooterSlotNames,t])},this.pluginHostController=r(this,{onSlotNamesChange:e=>{this._pluginSlotNames=e}}),this.onBeforeRenderOverride=async e=>{this._instance&&this.releaseMount(),this._instance=e,this.onViewPreChange&&this.subscribe({type:o.VIEW_PRE_CHANGE,handler:this.onViewPreChange}),this.subscribe({type:o.VIEW_CHANGE,handler:this.onViewChange||this.defaultViewChangeHandler}),this.renderUserDefinedResponse||(this.subscribe({type:o.USER_DEFINED_RESPONSE,handler:this.userDefinedHandler}),this.subscribe({type:o.CHUNK_USER_DEFINED_RESPONSE,handler:this.userDefinedHandler})),this.renderCustomMessageFooter||this.subscribe({type:o.CUSTOM_FOOTER_SLOT,handler:this.customFooterHandler}),this.addWriteableElementSlots(),await this.onBeforeRender?.(e)}}createRenderRoot(){let e=super.createRenderRoot();return m.hideSheet&&(e.adoptedStyleSheets=[...e.adoptedStyleSheets,m.hideSheet]),e}connectedCallback(){super.connectedCallback(),this.pluginHostController.connect()}disconnectedCallback(){queueMicrotask(()=>{this.isConnected||(this.pluginHostController.disconnect(),this.releaseMount())}),super.disconnectedCallback()}releaseMount(){this._instance?.off(this._mountHandlers),this._mountHandlers=[],this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._instance=void 0}subscribe(e){this._mountHandlers.push(e),this._instance.on(e)}addWriteableElementSlots(){this._writeableElementSlots=Object.keys(this._instance.writeableElements)}render(){return a`
      <cds-aichat-container
        .config=${this.resolvedConfig}
        .header=${this.resolvedConfig.header}
        .onAfterRender=${this.onAfterRender}
        .onBeforeRender=${this.onBeforeRenderOverride}
        .element=${this}
        .renderUserDefinedResponse=${this.renderUserDefinedResponse}
        .renderCustomMessageFooter=${this.renderCustomMessageFooter}
        .renderCustomRequestFooter=${this.renderCustomRequestFooter}
        .renderUserDefinedInputNode=${this.renderUserDefinedInputNode}
        exportparts="prompt-container">
        ${this._writeableElementSlots.map(e=>a`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderUserDefinedResponse?null:this._userDefinedSlotNames.map(e=>a`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderCustomMessageFooter?null:this._customFooterSlotNames.map(e=>a`<div slot=${e}><slot name=${e}></slot></div>`)}
        ${this._pluginSlotNames.map(e=>a`<slot name=${e} slot=${e}></slot>`)}
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
    `),i([u({attribute:!1})],h.prototype,`onBeforeRender`,void 0),i([u({attribute:!1})],h.prototype,`onAfterRender`,void 0),i([u()],h.prototype,`onViewPreChange`,void 0),i([u()],h.prototype,`onViewChange`,void 0),i([u({attribute:!1})],h.prototype,`renderUserDefinedResponse`,void 0),i([u({attribute:!1})],h.prototype,`renderCustomMessageFooter`,void 0),i([u({attribute:!1})],h.prototype,`renderCustomRequestFooter`,void 0),i([u({attribute:!1})],h.prototype,`renderUserDefinedInputNode`,void 0),i([s()],h.prototype,`_userDefinedSlotNames`,void 0),i([s()],h.prototype,`_writeableElementSlots`,void 0),i([s()],h.prototype,`_customFooterSlotNames`,void 0),i([s()],h.prototype,`_pluginSlotNames`,void 0),i([s()],h.prototype,`_instance`,void 0),h=m=i([d(`cds-aichat-custom-element`)],h);var g=h;export{p as t};