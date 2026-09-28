import{a as e,c as t,n,t as r}from"./client-DtUzF6_Z.js";import{C as i,M as a,S as o}from"./if-non-empty-B8ubEID4.js";import{Et as s,J as c,Nt as l,Tt as u,Y as d,Z as f,d as p,dt as m,jt as h,t as g}from"./plugin-host-container-EEHM3B14.js";import{n as _,t as v}from"./chat.index-BgPxmfCG.js";var y=t({__cds_aichat_container_register:()=>v,default:()=>S});e(),r(),s(),f(),n(),d(),c(),p(),u();var b,x=b=class extends _{constructor(){super(...arguments),this._userDefinedSlotNames=[],this._writeableElementSlots=[],this._customFooterSlotNames=[],this._pluginSlotNames=[],this.defaultViewChangeHandler=e=>{e.newViewState.mainWindow?this.classList.remove(`cds-aichat--hidden`):this.classList.add(`cds-aichat--hidden`)},this.userDefinedHandler=e=>{let{slot:t}=e.data;this._userDefinedSlotNames.includes(t)||(this._userDefinedSlotNames=[...this._userDefinedSlotNames,t])},this.customFooterHandler=e=>{let{slotName:t}=e.data;this._customFooterSlotNames.includes(t)||(this._customFooterSlotNames=[...this._customFooterSlotNames,t])},this.pluginHostController=g(this,{onSlotNamesChange:e=>{this._pluginSlotNames=e}}),this.onBeforeRenderOverride=async e=>{this._instance=e,this.onViewPreChange&&this._instance.on({type:m.VIEW_PRE_CHANGE,handler:this.onViewPreChange}),this._instance.on({type:m.VIEW_CHANGE,handler:this.onViewChange||this.defaultViewChangeHandler}),this.renderUserDefinedResponse||(this._instance.on({type:m.USER_DEFINED_RESPONSE,handler:this.userDefinedHandler}),this._instance.on({type:m.CHUNK_USER_DEFINED_RESPONSE,handler:this.userDefinedHandler})),this.renderCustomMessageFooter||this._instance.on({type:m.CUSTOM_FOOTER_SLOT,handler:this.customFooterHandler}),this.addWriteableElementSlots(),await this.onBeforeRender?.(e)}}createRenderRoot(){let e=super.createRenderRoot();return e.adoptedStyleSheets=[...e.adoptedStyleSheets,b.hideSheet],e}connectedCallback(){super.connectedCallback(),this.pluginHostController.connect()}disconnectedCallback(){this.pluginHostController.disconnect(),super.disconnectedCallback()}addWriteableElementSlots(){this._writeableElementSlots=Object.keys(this._instance.writeableElements)}render(){return a`
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
    `}};x.hideSheet=new CSSStyleSheet,b.hideSheet.replaceSync?.(`
      :host {
        display: block;
      }
      :host(.cds-aichat--hidden) {
        width: 0 !important;
        height: 0 !important;
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 0 !important;
        max-height: 0 !important;
        inline-size: 0 !important;
        block-size: 0 !important;
        min-inline-size: 0 !important;
        min-block-size: 0 !important;
        max-inline-size: 0 !important;
        max-block-size: 0 !important;
        overflow: hidden !important;
        display: block !important;
      }
    `),l([i({attribute:!1})],x.prototype,`onBeforeRender`,void 0),l([i({attribute:!1})],x.prototype,`onAfterRender`,void 0),l([i()],x.prototype,`onViewPreChange`,void 0),l([i()],x.prototype,`onViewChange`,void 0),l([i({attribute:!1})],x.prototype,`renderUserDefinedResponse`,void 0),l([i({attribute:!1})],x.prototype,`renderCustomMessageFooter`,void 0),l([i({attribute:!1})],x.prototype,`renderCustomRequestFooter`,void 0),l([i({attribute:!1})],x.prototype,`renderUserDefinedInputNode`,void 0),l([o()],x.prototype,`_userDefinedSlotNames`,void 0),l([o()],x.prototype,`_writeableElementSlots`,void 0),l([o()],x.prototype,`_customFooterSlotNames`,void 0),l([o()],x.prototype,`_pluginSlotNames`,void 0),l([o()],x.prototype,`_instance`,void 0),x=b=l([h(`cds-aichat-custom-element`)],x);var S=x;export{y as t};