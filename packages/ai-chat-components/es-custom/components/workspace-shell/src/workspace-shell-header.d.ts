import { LitElement } from "lit";
/**
 * Workspace Shell Header.
 *
 * @element cds-aichat-workspace-shell-header
 *
 * @slot header-description - Represents the description area in the Header.
 * @slot header-action - Represents the action area in the workspace.
 *
 */
declare class CDSAIChatWorkspaceShellHeader extends LitElement {
    static styles: any;
    /**
     * Sets default slot value to toolbar
     */
    slot: string;
    /**
     * Sets the Title text for the Toolbar Component
     */
    titleText: any;
    /**
     * Sets the subTitle text for the Toolbar Component
     */
    subTitleText: any;
    render(): import("lit-html").TemplateResult<1>;
}
export { CDSAIChatWorkspaceShellHeader };
export default CDSAIChatWorkspaceShellHeader;
