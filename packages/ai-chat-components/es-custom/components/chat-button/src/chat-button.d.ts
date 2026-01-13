/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { PropertyValues } from "lit";
import { CHAT_BUTTON_SIZE } from "../defs";
import { BUTTON_KIND as CHAT_BUTTON_KIND, BUTTON_TYPE as CHAT_BUTTON_TYPE, BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_ALIGNMENT, BUTTON_TYPE as CHAT_BUTTON_TOOLTIP_POSITION } from "@carbon/web-components/es-custom/components/button/button.js";
import CDSButton from "@carbon/web-components/es-custom/components/button/button.js";
export { CHAT_BUTTON_KIND, CHAT_BUTTON_TYPE, CHAT_BUTTON_SIZE, CHAT_BUTTON_TOOLTIP_ALIGNMENT, CHAT_BUTTON_TOOLTIP_POSITION, };
type ChatButtonSize = CHAT_BUTTON_SIZE.SMALL | CHAT_BUTTON_SIZE.MEDIUM | CHAT_BUTTON_SIZE.LARGE;
/**
 * Component extending the @carbon/web-components' button
 *
 * @element cds-aichat-button
 */
declare class CDSAIChatButton extends CDSButton {
    static styles: any;
    /**
     * Specify whether the `ChatButton` should be rendered as a quick action button
     */
    isQuickAction: boolean;
    /**
     * Button size.
     * Options: "sm", "md", "lg".
     */
    size: ChatButtonSize;
    protected willUpdate(changedProps: PropertyValues<this>): void;
    private _normalizeButtonState;
}
declare global {
    interface HTMLElementTagNameMap {
        "cds-aichat-button": CDSAIChatButton;
    }
}
export { CDSAIChatButton };
export default CDSAIChatButton;
