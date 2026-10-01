import{a as e,n as t,s as n,t as r}from"./client-TMuVrcuJ.js";import{C as i,M as a,S as o}from"./if-non-empty-B8ubEID4.js";import{At as s,J as c,Mt as l,Tt as u,X as d,lt as f,q as p,t as m,wt as h}from"./plugin-host-container-D2xYNSc6.js";import{n as g,t as _}from"./chat.cds-aichat-container-DQZ4u07G.js";var v=n({__cds_aichat_container_register:()=>_,default:()=>x});e(),r(),u(),d(),t(),c(),p(),h();var y,b=y=class extends g{constructor(){super(...arguments),this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._pluginSlotNames=[],this.defaultViewChangeHandler=e=>{e.newViewState.mainWindow?this.classList.remove(`cds-aichat--hidden`):this.classList.add(`cds-aichat--hidden`)},this.userDefinedHandler=e=>{let{slot:t}=e.data;this._userDefinedSlotNames.includes(t)||(this._userDefinedSlotNames=[...this._userDefinedSlotNames,t])},this.customFooterHandler=e=>{let{slotName:t}=e.data;this._customFooterSlotNames.includes(t)||(this._customFooterSlotNames=[...this._customFooterSlotNames,t])},this.pluginHostController=m(this,{onSlotNamesChange:e=>{this._pluginSlotNames=e}}),this.onBeforeRenderOverride=async e=>{this._instance=e,this.onViewPreChange&&this._instance.on({type:f.VIEW_PRE_CHANGE,handler:this.onViewPreChange}),this._instance.on({type:f.VIEW_CHANGE,handler:this.onViewChange||this.defaultViewChangeHandler}),this.renderUserDefinedResponse||(this._instance.on({type:f.USER_DEFINED_RESPONSE,handler:this.userDefinedHandler}),this._instance.on({type:f.CHUNK_USER_DEFINED_RESPONSE,handler:this.userDefinedHandler})),this.renderCustomMessageFooter||this._instance.on({type:f.CUSTOM_FOOTER_SLOT,handler:this.customFooterHandler}),this.addWriteableElementSlots(),await this.onBeforeRender?.(e)}}createRenderRoot(){let e=super.createRenderRoot();return e.adoptedStyleSheets=[...e.adoptedStyleSheets,y.hideSheet],e}connectedCallback(){super.connectedCallback(),this.pluginHostController.connect()}disconnectedCallback(){this.pluginHostController.disconnect(),super.disconnectedCallback()}addWriteableElementSlots(){this._writeableElementSlots=Object.keys(this._instance.writeableElements)}render(){return a`
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
        ${this._writeableElementSlots.map(e=>a`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderUserDefinedResponse?null:this._userDefinedSlotNames.map(e=>a`<slot name=${e} slot=${e}></slot>`)}
        ${this.renderCustomMessageFooter?null:this._customFooterSlotNames.map(e=>a`<div slot=${e}><slot name=${e}></slot></div>`)}
        ${this._pluginSlotNames.map(e=>a`<slot name=${e} slot=${e}></slot>`)}
      </cds-aichat-container>
    `}};b.hideSheet=new CSSStyleSheet,y.hideSheet.replaceSync?.(`
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
    `),l([i({attribute:!1})],b.prototype,`onBeforeRender`,void 0),l([i({attribute:!1})],b.prototype,`onAfterRender`,void 0),l([i()],b.prototype,`onViewPreChange`,void 0),l([i()],b.prototype,`onViewChange`,void 0),l([i({attribute:!1})],b.prototype,`renderUserDefinedResponse`,void 0),l([i({attribute:!1})],b.prototype,`renderCustomMessageFooter`,void 0),l([i({attribute:!1})],b.prototype,`renderCustomRequestFooter`,void 0),l([i({attribute:!1})],b.prototype,`renderUserDefinedInputNode`,void 0),l([o()],b.prototype,`_userDefinedSlotNames`,void 0),l([o()],b.prototype,`_writeableElementSlots`,void 0),l([o()],b.prototype,`_customFooterSlotNames`,void 0),l([o()],b.prototype,`_pluginSlotNames`,void 0),l([o()],b.prototype,`_instance`,void 0),b=y=l([s(`cds-aichat-custom-element`)],b);var x=b;export{v as t};