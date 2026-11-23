import{i as e,s as t,t as n}from"./client-D5LrhmPS.js";import{En as r,Ht as i,Lt as a,Rt as o,Ut as s,a as c,bn as l,r as u,t as d,xn as f}from"./chat.cds-aichat-container-1l02Vm4C.js";import{t as p}from"./chat.react-dom-renderer-CJcyvnO_.js";var m=t({__cds_aichat_container_register:()=>d,default:()=>_});e(),n();var h;p();var g=h=class extends u{constructor(){super(...arguments),this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._pluginSlotNames=[],this._mountHandlers=[],this.defaultViewChangeHandler=e=>{e.newViewState.mainWindow?this.classList.remove(`cds-aichat--hidden`):this.classList.add(`cds-aichat--hidden`)},this.userDefinedHandler=e=>{let{slot:t}=e.data;this._userDefinedSlotNames.includes(t)||(this._userDefinedSlotNames=[...this._userDefinedSlotNames,t])},this.customFooterHandler=e=>{let{slotName:t}=e.data;this._customFooterSlotNames.includes(t)||(this._customFooterSlotNames=[...this._customFooterSlotNames,t])},this.pluginHostController=a(this,{onSlotNamesChange:e=>{this._pluginSlotNames=e},ownsOffer:e=>c(e,this,this.innerContainer()),shouldDefer:e=>!c(e,this,this.innerContainer())}),this.onBeforeRenderOverride=async e=>{this._instance&&this.releaseMount(),this._instance=e,typeof this.onViewPreChange==`function`&&this.subscribe({type:s.VIEW_PRE_CHANGE,handler:this.onViewPreChange}),this.subscribe({type:s.VIEW_CHANGE,handler:typeof this.onViewChange==`function`?this.onViewChange:this.defaultViewChangeHandler}),this.renderUserDefinedResponse||(this.subscribe({type:s.USER_DEFINED_RESPONSE,handler:this.userDefinedHandler}),this.subscribe({type:s.CHUNK_USER_DEFINED_RESPONSE,handler:this.userDefinedHandler})),this.renderCustomMessageFooter||this.subscribe({type:s.CUSTOM_FOOTER_SLOT,handler:this.customFooterHandler}),this.addWriteableElementSlots(),await this.onBeforeRender?.(e)}}createRenderRoot(){let e=super.createRenderRoot();return h.hideSheet&&(e.adoptedStyleSheets=[...e.adoptedStyleSheets,h.hideSheet]),e}innerContainer(){return this.renderRoot?.querySelector(`cds-aichat-container`)}connectedCallback(){super.connectedCallback(),this.pluginHostController.connect()}disconnectedCallback(){queueMicrotask(()=>{this.isConnected||(this.pluginHostController.disconnect(),this.releaseMount())}),super.disconnectedCallback()}releaseMount(){this._instance?.off(this._mountHandlers),this._mountHandlers=[],this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._instance=void 0}subscribe(e){this._mountHandlers.push(e),this._instance.on(e)}addWriteableElementSlots(){this._writeableElementSlots=Object.keys(this._instance.writeableElements)}render(){return r`
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
        ${this._writeableElementSlots.map(e=>r`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderUserDefinedResponse?null:this._userDefinedSlotNames.map(e=>r`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderCustomMessageFooter?null:this._customFooterSlotNames.map(e=>r`<div slot=${e}><slot name=${e}></slot></div>`)}
        ${this._pluginSlotNames.map(e=>r`<slot name=${e} slot=${e}></slot>`)}
      </cds-aichat-container>
    `}};g.hideSheet=typeof CSSStyleSheet>`u`?void 0:new CSSStyleSheet,h.hideSheet?.replaceSync?.(`
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
    `),i([f({attribute:!1})],g.prototype,`onBeforeRender`,void 0),i([f({attribute:!1})],g.prototype,`onAfterRender`,void 0),i([f()],g.prototype,`onViewPreChange`,void 0),i([f()],g.prototype,`onViewChange`,void 0),i([f({attribute:!1})],g.prototype,`renderUserDefinedResponse`,void 0),i([f({attribute:!1})],g.prototype,`renderCustomMessageFooter`,void 0),i([f({attribute:!1})],g.prototype,`renderCustomRequestFooter`,void 0),i([f({attribute:!1})],g.prototype,`renderUserDefinedInputNode`,void 0),i([l()],g.prototype,`_userDefinedSlotNames`,void 0),i([l()],g.prototype,`_writeableElementSlots`,void 0),i([l()],g.prototype,`_customFooterSlotNames`,void 0),i([l()],g.prototype,`_pluginSlotNames`,void 0),i([l()],g.prototype,`_instance`,void 0),g=h=i([o(`cds-aichat-custom-element`)],g);var _=g;export{m as t};