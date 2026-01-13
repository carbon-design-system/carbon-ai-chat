import { LitElement } from "lit";
declare class CDSAIChatFeedbackButtons extends LitElement {
    static styles: any;
    /**
     * Indicates if the details panel for the positive feedback is open.
     */
    isPositiveOpen: boolean;
    /**
     * Indicates if the details panel for the negative feedback is open.
     */
    isNegativeOpen: boolean;
    /**
     * Indicates if the positive feedback button should shown as selected.
     */
    isPositiveSelected: boolean;
    /**
     * Indicates if the positive feedback button will be used to show or hide a details panel.
     */
    hasPositiveDetails: boolean;
    /**
     * Indicates if the negative feedback button will be used to show or hide a details panel.
     */
    hasNegativeDetails: boolean;
    /**
     * Indicates if the positive feedback button should shown as selected.
     */
    isNegativeSelected: boolean;
    /**
     * Indicates if the positive feedback button should shown as disabled.
     */
    isPositiveDisabled: boolean;
    /**
     * Indicates if the negative feedback button should shown as disabled.
     */
    isNegativeDisabled: boolean;
    /**
     * The label for the positive button.
     */
    positiveLabel?: string;
    /**
     * The label for the negative button.
     */
    negativeLabel?: string;
    /**
     * The unique ID of the panel that is used for showing details.
     */
    panelID?: string;
    /**
     * Dispatches an event notifying listeners that a button has been clicked.
     */
    handleButtonClick(isPositive: boolean): void;
    render(): import("lit-html").TemplateResult<1>;
}
interface FeedbackButtonsClickEventDetail {
    isPositive: boolean;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-feedback-buttons": CDSAIChatFeedbackButtons;
    }
}
export { CDSAIChatFeedbackButtons, type FeedbackButtonsClickEventDetail };
export default CDSAIChatFeedbackButtons;
