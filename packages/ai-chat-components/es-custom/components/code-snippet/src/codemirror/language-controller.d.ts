import { Compartment } from "@codemirror/state";
import { LanguageSupport } from "@codemirror/language";
import { EditorView } from "@codemirror/view";
interface LanguageStateUpdate {
    detectedLanguage?: string | null;
    lockLabel?: boolean;
}
interface LanguageControllerConfig {
    getLanguageAttribute(): string;
    getContent(): string;
    isHighlightEnabled(): boolean;
    getEditorView(): EditorView | undefined;
    getLanguageCompartment(): Compartment;
    isLanguageLabelLocked(): boolean;
    getDefaultLanguage(): string;
    updateState(update: LanguageStateUpdate): void;
}
export declare class LanguageController {
    private readonly config;
    private pendingLanguageLoad;
    private languageDetectionTimeout;
    private highlightingDetectionTimeout;
    private editableLanguageDetectionTimeout;
    private canDetectForHighlighting;
    constructor(config: LanguageControllerConfig);
    resolveLanguageSupport(): Promise<LanguageSupport | null>;
    handleStreamingLanguageDetection(): Promise<void>;
    detectLanguageForEditable(content: string): void;
    reset(): void;
    dispose(): void;
    private lockDetectedLanguageFromContent;
    private scheduleHighlightingDetectionReset;
    private clearLanguageDetectionTimeout;
    private clearHighlightingDetectionTimeout;
    private clearEditableDetectionTimeout;
    private disposeTimers;
}
export type { LanguageStateUpdate };
