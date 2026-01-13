/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
const legacyCustomElement = (tagName, clazz) => {
    try {
        customElements.define(tagName, clazz);
    }
    catch (error) {
        // console.warn(`Attempting to re-define ${tagName}`);
    }
    // Cast as any because TS doesn't recognize the return type as being a
    // subtype of the decorated class when clazz is typed as
    // `Constructor<HTMLElement>` for some reason.
    // `Constructor<HTMLElement>` is helpful to make sure the decorator is
    // applied to elements however.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return clazz;
};
const standardCustomElement = (tagName, descriptor) => {
    const { kind, elements } = descriptor;
    return {
        kind,
        elements,
        // This callback is called once the class is otherwise fully defined
        finisher(clazz) {
            try {
                customElements.define(tagName, clazz);
            }
            catch (error) {
                // console.warn(`Attempting to re-define ${tagName}`);
            }
        },
    };
};
/**
 * Class decorator factory that defines the decorated class as a custom element.
 *
 * ```js
 * @carbonElement('my-element')
 * class MyElement extends LitElement {
 *   render() {
 *     return html``;
 *   }
 * }
 * ```
 *
 * @param tagName The tag name of the custom element to define.
 */
function carbonElement(tagName) {
    return (classOrDescriptor) => typeof classOrDescriptor === "function"
        ? legacyCustomElement(tagName, classOrDescriptor)
        : standardCustomElement(tagName, classOrDescriptor);
}

export { carbonElement };
//# sourceMappingURL=carbon-element.js.map
