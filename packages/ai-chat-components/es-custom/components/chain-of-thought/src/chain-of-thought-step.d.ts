import "@carbon/web-components/es-custom/components/inline-loading/index.js";
import { LitElement } from "lit";
import { ChainOfThoughtStepStatus } from "../defs.js";
declare class CDSAIChatChainOfThoughtStep extends LitElement {
    static styles: any;
    title: string;
    stepNumber: number;
    labelText: string;
    status: ChainOfThoughtStepStatus;
    open: boolean;
    controlled: boolean;
    statusSucceededLabelText: string;
    statusFailedLabelText: string;
    statusProcessingLabelText: string;
    connectedCallback(): void;
    protected updated(changedProperties: Map<PropertyKey, unknown>): void;
    firstUpdated(): void;
    private getTriggerElement;
    private evaluateBodyContent;
    private isBodyNode;
    private updateStepParity;
    private isToolCallDataNode;
    private toolCallDataHasContent;
    private hasChildContent;
    private handleBodySlotChange;
    private handleToggleRequest;
    private handleButtonClick;
    private handleButtonKeydown;
    focus(options?: FocusOptions): void;
    private getHeaderTitle;
    private renderStatusIcon;
    private renderInteractiveHeader;
    private renderStaticHeader;
    private renderPanel;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-chain-of-thought-step": CDSAIChatChainOfThoughtStep;
    }
}
export { CDSAIChatChainOfThoughtStep };
export default CDSAIChatChainOfThoughtStep;
