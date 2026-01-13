import { LitElement } from "lit";
declare class CDSAIChatToolCallData extends LitElement {
    static styles: any;
    /**
     * Plain text name of the tool.
     */
    toolName: string;
    /**
     * Text string used to label step input.
     */
    inputLabelText: string;
    /**
     * Text string used to label step output.
     */
    outputLabelText: string;
    /**
     * Text string used to label the tool.
     */
    toolLabelText: string;
    connectedCallback(): void;
    firstUpdated(): void;
    private handleSlotChange;
    private syncSlotContent;
    private hasAssignedContent;
    render(): import("lit-html").TemplateResult<1>;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-tool-call-data": CDSAIChatToolCallData;
    }
}
export { CDSAIChatToolCallData };
export default CDSAIChatToolCallData;
