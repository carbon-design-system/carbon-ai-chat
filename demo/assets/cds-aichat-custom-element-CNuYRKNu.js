import{a as e,c as t,s as n,t as r}from"./client-DXX7A8Es.js";import{At as i,Et as a,Tt as o,_n as s,dn as c,fn as l,i as u,jt as d,r as f,t as p}from"./chat.cds-aichat-container-oQt4NABp.js";var m=t(e(),1),h=r();function g(){u({mount(e){let t=(0,h.createRoot)(e);return{render(e,n){t.render(m.createElement(e,n))},unmount(){t.unmount()}}}})}g();var _=n({__cds_aichat_container_register:()=>p,default:()=>b}),v;g();var y=v=class extends f{constructor(){super(...arguments),this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._pluginSlotNames=[],this._mountHandlers=[],this.defaultViewChangeHandler=e=>{e.newViewState.mainWindow?this.classList.remove(`cds-aichat--hidden`):this.classList.add(`cds-aichat--hidden`)},this.userDefinedHandler=e=>{let{slot:t}=e.data;this._userDefinedSlotNames.includes(t)||(this._userDefinedSlotNames=[...this._userDefinedSlotNames,t])},this.customFooterHandler=e=>{let{slotName:t}=e.data;this._customFooterSlotNames.includes(t)||(this._customFooterSlotNames=[...this._customFooterSlotNames,t])},this.pluginHostController=o(this,{onSlotNamesChange:e=>{this._pluginSlotNames=e}}),this.onBeforeRenderOverride=async e=>{this._instance&&this.releaseMount(),this._instance=e,this.onViewPreChange&&this.subscribe({type:d.VIEW_PRE_CHANGE,handler:this.onViewPreChange}),this.subscribe({type:d.VIEW_CHANGE,handler:this.onViewChange||this.defaultViewChangeHandler}),this.renderUserDefinedResponse||(this.subscribe({type:d.USER_DEFINED_RESPONSE,handler:this.userDefinedHandler}),this.subscribe({type:d.CHUNK_USER_DEFINED_RESPONSE,handler:this.userDefinedHandler})),this.renderCustomMessageFooter||this.subscribe({type:d.CUSTOM_FOOTER_SLOT,handler:this.customFooterHandler}),this.addWriteableElementSlots(),await this.onBeforeRender?.(e)}}createRenderRoot(){let e=super.createRenderRoot();return v.hideSheet&&(e.adoptedStyleSheets=[...e.adoptedStyleSheets,v.hideSheet]),e}connectedCallback(){super.connectedCallback(),this.pluginHostController.connect()}disconnectedCallback(){this.pluginHostController.disconnect(),queueMicrotask(()=>{this.isConnected||this.releaseMount()}),super.disconnectedCallback()}releaseMount(){this._instance?.off(this._mountHandlers),this._mountHandlers=[],this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._instance=void 0}subscribe(e){this._mountHandlers.push(e),this._instance.on(e)}addWriteableElementSlots(){this._writeableElementSlots=Object.keys(this._instance.writeableElements)}render(){return s`
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
        ${this._writeableElementSlots.map(e=>s`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderUserDefinedResponse?null:this._userDefinedSlotNames.map(e=>s`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderCustomMessageFooter?null:this._customFooterSlotNames.map(e=>s`<div slot=${e}><slot name=${e}></slot></div>`)}
        ${this._pluginSlotNames.map(e=>s`<slot name=${e} slot=${e}></slot>`)}
      </cds-aichat-container>
    `}};y.hideSheet=typeof CSSStyleSheet>`u`?void 0:new CSSStyleSheet,v.hideSheet?.replaceSync?.(`
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
    `),i([l({attribute:!1})],y.prototype,`onBeforeRender`,void 0),i([l({attribute:!1})],y.prototype,`onAfterRender`,void 0),i([l()],y.prototype,`onViewPreChange`,void 0),i([l()],y.prototype,`onViewChange`,void 0),i([l({attribute:!1})],y.prototype,`renderUserDefinedResponse`,void 0),i([l({attribute:!1})],y.prototype,`renderCustomMessageFooter`,void 0),i([l({attribute:!1})],y.prototype,`renderCustomRequestFooter`,void 0),i([l({attribute:!1})],y.prototype,`renderUserDefinedInputNode`,void 0),i([c()],y.prototype,`_userDefinedSlotNames`,void 0),i([c()],y.prototype,`_writeableElementSlots`,void 0),i([c()],y.prototype,`_customFooterSlotNames`,void 0),i([c()],y.prototype,`_pluginSlotNames`,void 0),i([c()],y.prototype,`_instance`,void 0),y=v=i([a(`cds-aichat-custom-element`)],y);var b=y;export{_ as t};