interface StreamingManagerConfig {
    getSlot(): HTMLSlotElement | null | undefined;
    getHost(): Element;
    onContentUpdate(content: string): void;
}
export declare class StreamingManager {
    private readonly config;
    private observer;
    private pendingFrame;
    private hasExtractedInitial;
    private cachedContent;
    constructor(config: StreamingManagerConfig);
    reset(initialContent?: string): void;
    connect(): void;
    disconnect(): void;
    dispose(): void;
    ensureInitialContent(): void;
    handleSlotChange(): void;
    syncSlotObservers(): void;
    private observeAssignedNodes;
    private handleMutations;
    private extractContent;
}
export {};
