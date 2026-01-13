import { LitElement } from "lit";
declare class CDSAIChatReasoningStepsToggle extends LitElement {
    static styles: any;
    /**
     * Indicates if the reasoning steps panel is open.
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
    panelID?: string;
    /**
     * Whether the control should be disabled.
     */
    disabled: boolean;
    handleToggleClick(): void;
    render(): import("lit-html").TemplateResult<1>;
}
interface ReasoningStepsToggleEventDetail {
    open: boolean;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-reasoning-steps-toggle": CDSAIChatReasoningStepsToggle;
    }
}
export { CDSAIChatReasoningStepsToggle, type ReasoningStepsToggleEventDetail };
export default CDSAIChatReasoningStepsToggle;
