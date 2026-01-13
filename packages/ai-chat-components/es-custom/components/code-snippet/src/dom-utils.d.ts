/**
 * Observes resize of the given element with the provided resize observer.
 * Returns an object with a release() method to clean up the observer.
 */
export declare const observeResize: (observer: ResizeObserver, elem: Element) => {
    release(): null;
} | null;
/**
 * Gets scroll and dimension information from a code reference element.
 */
export declare function getCodeRefDimensions(ref: Element): {
    horizontalOverflow: boolean;
    codeClientWidth: number;
    codeScrollWidth: number;
    codeScrollLeft: number;
};
/**
 * Extracts text content from child nodes of an element without trimming so callers can decide how to normalize whitespace.
 */
export declare function extractTextContent(element: Element): string;
/**
 * Extracts text content from a slot's assigned nodes without trimming so streaming whitespace is preserved.
 */
export declare function extractSlotContent(slot: HTMLSlotElement): string;
