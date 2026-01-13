import { LitElement } from "lit";
declare class CDSAIChatChainOfThoughtToggle extends LitElement {
    static styles: any;
    /**
     * Indicates if the chain of thought panel is open.
     */
    open: boolean;
    /**
     * Label text when the panel is open.
     */
    openLabelText: string;
    /**
     * Label text when the panel is closed.
     */
    closedLabelText: string;
    /**
     * The ID of the panel controlled by this button.
     */
    panelId?: string;
    /**
     * Whether the control should be disabled.
     */
    disabled: boolean;
    handleToggleClick(): void;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-chain-of-thought-toggle": CDSAIChatChainOfThoughtToggle;
    }
}
export { CDSAIChatChainOfThoughtToggle };
export default CDSAIChatChainOfThoughtToggle;
