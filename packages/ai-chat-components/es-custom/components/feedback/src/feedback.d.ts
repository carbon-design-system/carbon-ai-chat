import { LitElement, PropertyValues } from "lit";
/**
 * The component for displaying a panel requesting feedback from a user.
 */
declare class CDSAIChatFeedback extends LitElement {
    static styles: any;
    /**
     * The CSS class of this panel.
     */
    class: string;
    /**
     * The ID of this panel.
     */
    id: string;
    /**
     * Indicates if the feedback details are open.
     */
    isOpen: boolean;
    /**
     * Indicates if the feedback details are readonly.
     */
    isReadonly: boolean;
    /**
     * The initial values to display in the feedback.
     */
    initialValues?: FeedbackInitialValues;
    /**
     * The title to display in the popup. A default value will be used if no value is provided here.
     */
    title: string;
    /**
     * The prompt text to display to the user. A default value will be used if no value is provided here.
     */
    prompt: string;
    /**
     * The list of categories to show.
     */
    categories?: string[];
    /**
     * The legal disclaimer text to show at the bottom of the popup. This text may contain rich markdown content. If this
     * value is not provided, no text will be shown.
     */
    disclaimer?: string;
    /**
     * The placeholder to show in the text area. A default value will be used if no value is provided here.
     */
    placeholder?: string;
    /**
     * The label for the cancel button. A default value will be used if no value is provided here.
     */
    cancelLabel?: string;
    /**
     * The label for the submit button. A default value will be used if no value is provided here.
     */
    submitLabel?: string;
    /**
     * Indicates whether the text area should be shown.
     */
    showTextArea: boolean;
    /**
     * Indicates whether the prompt line should be shown.
     */
    showPrompt: boolean;
    /**
     * Called when the properties of the component have changed.
     */
    protected updated(changedProperties: PropertyValues<this>): void;
    /**
     * Updates the initial values used in the component.
     */
    protected _setInitialValues(values?: FeedbackInitialValues): void;
    /**
     * Stores the current value of the text area used to collect feedback.
     */
    _handleTextInput(event: InputEvent): void;
    /**
     * Called when the user clicks the submit button.
     */
    _handleSubmit(): void;
    /**
     * Called then the user clicks the close button.
     */
    _handleCancel(): void;
    /**
     * Called when a category button is clicked.
     */
    _handleCategoryClick(event: MouseEvent): void;
    render(): import("lit-html").TemplateResult<1>;
}
/**
 * The details included when the user clicked the submit button.
 */
interface FeedbackSubmitDetails {
    /**
     * The text from the text field.
     */
    text?: string;
    /**
     * The list of categories selected by the user.
     */
    selectedCategories?: string[];
}
/**
 * The set of initial values that are permitted.
 */
type FeedbackInitialValues = FeedbackSubmitDetails | null;
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-feedback": CDSAIChatFeedback;
    }
}
export { CDSAIChatFeedback, type FeedbackSubmitDetails, type FeedbackInitialValues, };
export default CDSAIChatFeedback;
