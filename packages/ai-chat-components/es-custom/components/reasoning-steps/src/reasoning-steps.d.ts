import { LitElement } from "lit";
declare class CDSAIChatReasoningSteps extends LitElement {
    static styles: any;
    open: boolean;
    controlled: boolean;
    connectedCallback(): void;
    updated(changedProperties: Map<PropertyKey, unknown>): void;
    propagateOpen(): void;
    propagateControlled(): void;
    markLastVisibleStep(): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-reasoning-steps": CDSAIChatReasoningSteps;
    }
}
export { CDSAIChatReasoningSteps };
export default CDSAIChatReasoningSteps;
