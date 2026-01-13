declare type Constructor<T> = {
    new (...args: any[]): T;
};
interface ClassDescriptor {
    kind: "class";
    elements: ClassElement[];
    finisher?: <T>(clazz: Constructor<T>) => void | Constructor<T>;
}
interface ClassElement {
    kind: "field" | "method";
    key: PropertyKey;
    placement: "static" | "prototype" | "own";
    initializer?: Function;
    extras?: ClassElement[];
    finisher?: <T>(clazz: Constructor<T>) => void | Constructor<T>;
    descriptor?: PropertyDescriptor;
}
/**
 * Allow for custom element classes with private constructors
 */
type CustomElementClass = Omit<typeof HTMLElement, "new">;
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
export declare function carbonElement(tagName: string): (classOrDescriptor: CustomElementClass | ClassDescriptor) => any;
export {};
