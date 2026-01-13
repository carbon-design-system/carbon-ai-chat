import { LitElement } from "lit";
import "@carbon/web-components/es-custom/components/button/index.js";
import "@carbon/web-components/es-custom/components/overflow-menu/index.js";
import { CarbonIcon } from "@carbon/web-components/es-custom/globals/internal/icon-loader-utils.js";
export interface Action {
    text: string;
    icon: CarbonIcon;
    size?: string;
    fixed?: boolean;
    onClick: () => void;
}
/**
 * Toolbar.
 *
 * @element cds-aichat-toolbar
 * @slot navigation - Defines the navigation area of the toolbar.
 * @slot title - Defines the title section of the toolbar.
 * @slot fixed-actions - Defines the area for displaying actions that are always visible (not overflowed) in the toolbar.
 * @slot toolbar-ai-label - Defines the area for displaying the AI label in the toolbar.
 *
 */
declare class CDSAIChatToolbar extends LitElement {
    /** The list of actions. */
    actions: Action[];
    /** Should actions be overflowing. */
    overflow: boolean;
    private measuring;
    private overflowHandler?;
    connectedCallback(): void;
    firstUpdated(): void;
    updated(changedProps: Map<string, unknown>): void;
    private setupOverflowHandler;
    disconnectedCallback(): void;
    render(): import("lit-html").TemplateResult<1>;
    static styles: any;
}
export { CDSAIChatToolbar };
export default CDSAIChatToolbar;
