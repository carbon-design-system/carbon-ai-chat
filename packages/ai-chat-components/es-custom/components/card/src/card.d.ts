/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */
import CDSTile from "@carbon/web-components/es-custom/components/tile/tile.js";
/**
 * Component extending the @carbon/web-components' button
 */
declare class Card extends CDSTile {
    static styles: any;
    /**
     * Specify whether the `Card` layering style. if true, the card will follow carbon layering style, otherwise chat shell layering style.
     */
    isLayered: boolean;
    /**
     * Specify whether the padding should be removed from the card. default is true.
     * This is useful when the card is used as a container for other components
     * and you want to remove the default padding from cds-custom-tile.
     */
    isFlush: boolean;
    render(): import("lit-html").TemplateResult<1>;
}
export default Card;
