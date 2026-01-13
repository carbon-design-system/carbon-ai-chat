declare function markdownTemplate({ slotRef, onSlotChange, renderedContent, }: {
    slotRef: any;
    onSlotChange: () => void;
    renderedContent: unknown;
}): import("lit-html").TemplateResult<1>;
export { markdownTemplate };
