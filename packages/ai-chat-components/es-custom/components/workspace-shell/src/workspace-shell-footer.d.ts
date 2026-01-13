import { LitElement } from "lit";
import "@carbon/web-components/es-custom/components/button/button.js";
import { CarbonIcon } from "@carbon/web-components/es-custom/globals/internal/icon-loader-utils.js";
import { BUTTON_KIND } from "@carbon/web-components/es-custom/components/button/button.js";
export type Action = {
    label: string;
    id?: string;
    kind?: BUTTON_KIND;
    disabled?: boolean;
    payload?: unknown;
    icon?: CarbonIcon;
};
/**
 * Workspace Shell Footer.
 * @element cds-aichat-workspace-shell-footer
 * @fires cds-aichat-workspace-shell-footer-clicked - The custom event fired when footer buttons are clicked.
 */
declare class CDSAIChatWorkspaceShellFooter extends LitElement {
    static styles: any;
    private _ro;
    private _isStacked;
    /**
     * Sets default slot value to footer
     */
    slot: string;
    actions: Action[];
    connectedCallback(): void;
    updated(changedProps: Map<string, any>): void;
    render(): import("lit-html").TemplateResult<1>;
    disconnectedCallback(): void;
    private handleAction;
    private _updateStacked;
    private _sortActions;
    /**
     * The name of the custom event fired when footer buttons are clicked.
     */
    static get eventButtonClick(): string;
}
export { CDSAIChatWorkspaceShellFooter };
export default CDSAIChatWorkspaceShellFooter;
