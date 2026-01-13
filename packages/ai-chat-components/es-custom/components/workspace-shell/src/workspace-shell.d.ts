import { LitElement } from "lit";
/**
 * Workspace Shell.
 *
 * @element cds-aichat-workspace-shell
 * @slot toolbar - Represents the toolbar area of the workspace.
 * @slot header - Represents the header section, containing title, subtitle and actions.
 * @slot notification - Area for displaying workspace notifications.
 * @slot body - The main content area of the workspace.
 * @slot footer - Represents the footer section, usually containing action buttons.
 *
 */
declare class CDSAIChatWorkspaceShell extends LitElement {
    static styles: any;
    render(): import("lit-html").TemplateResult<1>;
    closeWorkspaceShell: () => void;
}
export { CDSAIChatWorkspaceShell };
export default CDSAIChatWorkspaceShell;
