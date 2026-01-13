import { LitElement } from "lit";
declare class CDSAIChatReasoningStep extends LitElement {
    static styles: any;
    title: string;
    open: boolean;
    controlled: boolean;
    connectedCallback(): void;
    firstUpdated(): void;
    updated(changedProperties: Map<string, unknown>): void;
    private getTriggerElement;
    private evaluateBodyContent;
    private isBodyNode;
    private handleBodySlotChange;
    private handleToggleRequest;
    private handleButtonClick;
    private handleButtonKeydown;
    focus(options?: FocusOptions): void;
    private renderInteractiveHeader;
    private renderStaticHeader;
    private renderPanel;
    /**
     * Apply/remove inert on assigned elements so they are untabbable when closed.
     */
    private updatePanelInertState;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-reasoning-step": CDSAIChatReasoningStep;
    }
}
export { CDSAIChatReasoningStep };
export default CDSAIChatReasoningStep;
