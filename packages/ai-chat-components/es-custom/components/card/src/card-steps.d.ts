/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import { LitElement } from "lit";
import "@carbon/web-components/es-custom/components/icon-indicator/icon-indicator.js";
import "@carbon/web-components/es-custom/components/loading/loading.js";
import { ICON_INDICATOR_KIND } from "@carbon/web-components/es-custom/components/icon-indicator/icon-indicator.js";
export type Step = {
    title: string;
    description?: string;
    kind?: ICON_INDICATOR_KIND;
    label?: string;
};
/**
 * Step component
 */
declare class CardSteps extends LitElement {
    static styles: any;
    /** Steps to render */
    steps: Step[];
    render(): import("lit-html").TemplateResult<1>;
}
export default CardSteps;
