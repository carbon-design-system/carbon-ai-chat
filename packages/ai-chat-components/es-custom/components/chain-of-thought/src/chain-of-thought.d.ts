import { LitElement } from "lit";
import type { ChainOfThoughtOnToggle } from "../defs.js";
import type { CDSAIChatChainOfThoughtStep } from "./chain-of-thought-step.js";
declare class CDSAIChatChainOfThought extends LitElement {
    static styles: any;
    /**
     * Indicates if the details panel for the chain of thought is open.
     */
    open: boolean;
    /**
     * When true, each child step should be fully controlled by the host.
     */
    controlled: boolean;
    /**
     * ID of the content panel. Useful for wiring to an external toggle.
     */
    panelId: string;
    /**
     * Optional function to call if chain of thought visibility is toggled.
     */
    onToggle?: ChainOfThoughtOnToggle;
    /**
     * Optional function to call if a chain of thought step visibility is toggled.
     */
    onStepToggle?: ChainOfThoughtOnToggle;
    connectedCallback(): void;
    disconnectedCallback(): void;
    get steps(): NodeListOf<CDSAIChatChainOfThoughtStep>;
    protected updated(changedProperties: Map<PropertyKey, unknown>): void;
    private handleStepToggle;
    private propagateControlled;
    private dispatchToggleEvent;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-chain-of-thought": CDSAIChatChainOfThought;
    }
}
export { CDSAIChatChainOfThought };
export default CDSAIChatChainOfThought;
