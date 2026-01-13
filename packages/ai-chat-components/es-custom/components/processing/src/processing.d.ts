import { LitElement } from "lit";
declare class CDSAIChatProcessing extends LitElement {
    static styles: any;
    /** Enables the linear looping animation variant. */
    loop: boolean;
    /** Enables the quick-load animation variant. */
    quickLoad: boolean;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-processing": CDSAIChatProcessing;
    }
}
export { CDSAIChatProcessing };
export default CDSAIChatProcessing;
