/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { LitElement, nothing, PropertyValues } from "lit";
import "@carbon/web-components/es-custom/components/button/button.js";
import "@carbon/web-components/es-custom/components/icon-button/icon-button.js";
import { BUTTON_KIND, BUTTON_SIZE } from "@carbon/web-components/es-custom/components/button/button.js";
import { CarbonIcon } from "@carbon/web-components/es-custom/globals/internal/icon-loader-utils.js";
export type Action = {
    label: string;
    id?: string;
    kind?: BUTTON_KIND;
    disabled?: boolean;
    payload?: unknown;
    icon?: CarbonIcon;
    onClick?: () => void;
    tooltipText?: string;
    isViewing?: boolean;
};
/**
 * Footer action bar that renders Carbon buttons and emits an `action` event.
 * Consumers listen for events instead of passing callbacks.
 */
declare class CardFooter extends LitElement {
    static styles: any;
    /**
     * Sets default slot value to footer
     */
    slot: string;
    /** Card actions to render */
    actions: Action[];
    size?: BUTTON_SIZE;
    isIconButton: boolean;
    private handleAction;
    updated(changedProperties: PropertyValues): void;
    render(): import("lit-html").TemplateResult<1> | typeof nothing;
}
export default CardFooter;
