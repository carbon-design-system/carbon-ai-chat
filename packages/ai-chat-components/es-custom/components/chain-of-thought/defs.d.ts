/**
 * Status of the chain of thought step.
 *
 * @category Messaging
 */
declare enum ChainOfThoughtStepStatus {
    /**
     * If the tool call is currently processing.
     */
    PROCESSING = "processing",
    /**
     * If the tool call failed.
     */
    FAILURE = "failure",
    /**
     * If the tool call succeeded.
     */
    SUCCESS = "success"
}
/**
 * A function to allow the chat component to properly scroll to the element on toggle.
 */
type ChainOfThoughtOnToggle = (
/**
 * Whether the container is open after the toggle.
 */
isOpen: boolean, 
/**
 * Target element to scroll into view if needed.
 */
scrollToElement: HTMLElement) => void;
/**
 * Event detail for a chain-of-thought toggle interaction.
 */
interface ChainOfThoughtToggleEventDetail {
    /**
     * Whether the container is open after the toggle event.
     */
    open: boolean;
    /**
     * The panel id connected to the toggle button.
     */
    panelId?: string;
}
/**
 * Event detail for a single chain-of-thought step toggle.
 */
interface ChainOfThoughtStepToggleEventDetail {
    /**
     * Whether the step is expanded after the toggle event.
     */
    open: boolean;
}
export { type ChainOfThoughtOnToggle, ChainOfThoughtStepStatus, type ChainOfThoughtStepToggleEventDetail, type ChainOfThoughtToggleEventDetail, };
