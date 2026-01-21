/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { Compartment } from "@codemirror/state";
import { LanguageDescription, LanguageSupport } from "@codemirror/language";
import { languages } from "./language-data.js";
import { EditorView } from "@codemirror/view";
import { detectLanguage, mapLanguageName } from "./language-utils.js";

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

function loadLanguageSupport(langDesc: LanguageDescription) {
  return langDesc.load();
}

export class LanguageController {
  private pendingLanguageLoad: Promise<void> | null = null;
  private languageDetectionTimeout: number | null = null;
  private highlightingDetectionTimeout: number | null = null;
  private editableLanguageDetectionTimeout: number | null = null;
  private canDetectForHighlighting = true;

  constructor(private readonly config: LanguageControllerConfig) {}

  async resolveLanguageSupport(): Promise<LanguageSupport | null> {
    const languageAttr = this.config.getLanguageAttribute();
    const content = this.config.getContent();

    let languageToUse = languageAttr
      ? (mapLanguageName(languageAttr) ?? languageAttr)
      : "";

    if (!languageToUse && content) {
      const trimmed = content.trim();
      if (trimmed) {
        const detected = detectLanguage(trimmed);
        languageToUse = detected ?? "";
      }
    }

    // Use default language for empty editable content
    if (!languageToUse && this.config.getDefaultLanguage()) {
      const trimmed = content.trim();
      if (!trimmed) {
        languageToUse = this.config.getDefaultLanguage();
      }
    }

    if (!languageToUse) {
      this.config.updateState({ detectedLanguage: null, lockLabel: false });
      return null;
    }

    const langDesc = LanguageDescription.matchLanguageName(
      languages,
      languageToUse,
      true,
    );

    const detectedLanguage = langDesc ? languageToUse : null;
    this.config.updateState({
      detectedLanguage,
      lockLabel: Boolean(languageAttr && detectedLanguage),
    });

    if (!this.config.isHighlightEnabled() || !langDesc) {
      return null;
    }

    try {
      return await loadLanguageSupport(langDesc);
    } catch (error) {
      console.warn(`Failed to load language support for "${languageToUse}"`);
      return null;
    }
  }

  async handleStreamingLanguageDetection(): Promise<void> {
    if (this.config.getLanguageAttribute()) {
      return;
    }

    const trimmed = this.config.getContent().trim();
    if (!trimmed) {
      return;
    }

    if (
      !this.config.isLanguageLabelLocked() &&
      this.config.isHighlightEnabled() &&
      this.canDetectForHighlighting
    ) {
      const detected = detectLanguage(trimmed);
      if (detected) {
        const langDesc = LanguageDescription.matchLanguageName(
          languages,
          detected,
          true,
        );

        if (langDesc && !this.pendingLanguageLoad) {
          this.pendingLanguageLoad = loadLanguageSupport(langDesc)
            .then((support) => {
              const view = this.config.getEditorView();
              if (!view) {
                return;
              }
              view.dispatch({
                effects: this.config
                  .getLanguageCompartment()
                  .reconfigure([support]),
              });
            })
            .catch((_error) => {
              console.warn(`Failed to load language support for "${detected}"`);
            })
            .finally(() => {
              this.pendingLanguageLoad = null;
            });

          this.canDetectForHighlighting = false;
          this.scheduleHighlightingDetectionReset();
        }
      }
    }

    this.clearLanguageDetectionTimeout();

    if (!this.config.isLanguageLabelLocked()) {
      this.languageDetectionTimeout = window.setTimeout(() => {
        this.languageDetectionTimeout = null;
        this.lockDetectedLanguageFromContent();
      }, 200);
    }
  }

  detectLanguageForEditable(content: string) {
    if (this.config.getLanguageAttribute()) {
      return;
    }

    const trimmed = content.trim();
    if (!trimmed) {
      this.config.updateState({ detectedLanguage: null, lockLabel: false });
      return;
    }

    this.clearEditableDetectionTimeout();

    this.editableLanguageDetectionTimeout = window.setTimeout(() => {
      this.editableLanguageDetectionTimeout = null;
      const detected = detectLanguage(trimmed);
      if (!detected) {
        return;
      }

      const langDesc = LanguageDescription.matchLanguageName(
        languages,
        detected,
        true,
      );

      if (!langDesc) {
        return;
      }

      this.config.updateState({ detectedLanguage: detected, lockLabel: true });

      if (this.config.isHighlightEnabled() && !this.pendingLanguageLoad) {
        this.pendingLanguageLoad = loadLanguageSupport(langDesc)
          .then((support) => {
            const view = this.config.getEditorView();
            if (!view) {
              return;
            }
            view.dispatch({
              effects: this.config
                .getLanguageCompartment()
                .reconfigure([support]),
            });
          })
          .catch((_error) => {
            console.warn(`Failed to load language support for "${detected}"`);
          })
          .finally(() => {
            this.pendingLanguageLoad = null;
          });
      }
    }, 200);
  }

  reset() {
    this.disposeTimers();
    this.pendingLanguageLoad = null;
    this.canDetectForHighlighting = true;
    this.config.updateState({ detectedLanguage: null, lockLabel: false });
  }

  dispose() {
    this.disposeTimers();
    this.pendingLanguageLoad = null;
  }

  private lockDetectedLanguageFromContent() {
    if (
      this.config.getLanguageAttribute() ||
      this.config.isLanguageLabelLocked()
    ) {
      return;
    }

    const trimmed = this.config.getContent().trim();
    if (!trimmed) {
      return;
    }

    const detected = detectLanguage(trimmed);
    if (!detected) {
      return;
    }

    this.config.updateState({ detectedLanguage: detected, lockLabel: true });
  }

  private scheduleHighlightingDetectionReset() {
    this.clearHighlightingDetectionTimeout();
    this.highlightingDetectionTimeout = window.setTimeout(() => {
      this.canDetectForHighlighting = true;
      this.highlightingDetectionTimeout = null;
    }, 200);
  }

  private clearLanguageDetectionTimeout() {
    if (this.languageDetectionTimeout !== null) {
      window.clearTimeout(this.languageDetectionTimeout);
      this.languageDetectionTimeout = null;
    }
  }

  private clearHighlightingDetectionTimeout() {
    if (this.highlightingDetectionTimeout !== null) {
      window.clearTimeout(this.highlightingDetectionTimeout);
      this.highlightingDetectionTimeout = null;
    }
  }

  private clearEditableDetectionTimeout() {
    if (this.editableLanguageDetectionTimeout !== null) {
      window.clearTimeout(this.editableLanguageDetectionTimeout);
      this.editableLanguageDetectionTimeout = null;
    }
  }

  private disposeTimers() {
    this.clearLanguageDetectionTimeout();
    this.clearHighlightingDetectionTimeout();
    this.clearEditableDetectionTimeout();
  }
}

export type { LanguageStateUpdate };
