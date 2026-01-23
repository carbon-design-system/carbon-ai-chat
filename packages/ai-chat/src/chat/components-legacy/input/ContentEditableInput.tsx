/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, {
  FocusEvent,
  KeyboardEvent,
  forwardRef,
  useCallback,
  useImperativeHandle,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import { doFocusRef } from "../../utils/domUtils";
import {
  calculateAvailableLength,
  escapeHTML,
  extractNormalizedText,
  getSelectionForElement,
  getSelectionRange,
  getSelectionRangeForElement,
  normalizeTextValue,
  placeCaretAtEnd,
  truncateToLength,
  updateContentAttribute,
} from "./utils";

/**
 * Maximum height in pixels before the contenteditable div switches from auto-growing
 * to scrollable. This prevents the input from growing indefinitely on the page.
 */
const MAX_AUTO_RESIZE_HEIGHT = 180;

/**
 * Represents the value change emitted by the ContentEditableInput component.
 *
 * ContentEditable divs work with HTML internally, but we need to track both the
 * plain text value (for character counting, validation) and the HTML representation
 * (for rendering with proper line breaks and formatting).
 */
export type ContentEditableChange = {
  /** The plain text value extracted from the contenteditable div, normalized and sanitized */
  rawValue: string;
  /** The HTML representation of the value, safe for rendering (line breaks converted to <br> tags) */
  displayValue: string;
};

/**
 * Props for the ContentEditableInput component.
 *
 * This component uses a contenteditable div instead of a textarea to support:
 * - Auto-resizing height based on content
 * - Rich text display (though input is plain text only)
 * - Better control over paste behavior
 * - Compatibility with shadow DOM (web components)
 */
export interface ContentEditableInputProps {
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Enable automatic height adjustment based on content (up to MAX_AUTO_RESIZE_HEIGHT) */
  autoSize?: boolean;
  /** Disable the input (makes it non-editable and non-focusable) */
  disabled?: boolean;
  /**
   * The HTML representation of the current value to display in the contenteditable div.
   * Should contain <br> tags for line breaks. Use toDisplayHTML() utility to convert from raw text.
   */
  displayValue: string;
  /** Maximum number of characters allowed (enforced on input and paste) */
  maxLength: number;
  /**
   * The plain text value (without HTML). Used for character counting and as the source
   * of truth for the actual content. Should be kept in sync with displayValue.
   */
  rawValue: string;
  /** Called when the input loses focus */
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  /**
   * Called whenever the content changes (typing, pasting, etc.).
   * Receives both rawValue and displayValue for state management.
   */
  onChange: (value: ContentEditableChange) => void;
  /** Called when the input receives focus */
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  /** Called on keydown events (useful for handling Enter, Escape, etc.) */
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  /** Placeholder text shown when the input is empty */
  placeholder?: string;
  /** Test ID for automated testing */
  testId?: string;
}

/**
 * Imperative handle exposed by ContentEditableInput via ref.
 *
 * These methods allow parent components to programmatically control the input
 * without relying on React state updates, which is important for focus management
 * and accessibility.
 */
export interface ContentEditableInputHandle {
  /** Get the underlying HTMLDivElement for direct DOM manipulation if needed */
  getHTMLElement: () => HTMLDivElement | null;
  /** Programmatically focus the input and place caret at the end */
  takeFocus: () => void;
  /** Programmatically blur (unfocus) the input */
  doBlur: () => void;
}

/**
 * A contenteditable-based input component that provides a textarea-like experience
 * with better control over formatting, pasting, and auto-sizing.
 *
 * **Why contenteditable instead of textarea?**
 * - Allows auto-height adjustment without complex measurement hacks
 * - Better paste control (can intercept and sanitize HTML/rich text)
 * - Works correctly inside Shadow DOM (web components)
 * - Can display formatted content (though we only accept plain text input)
 *
 * **Key challenges with contenteditable:**
 * 1. **Selection Management**: The browser's Selection API behaves differently in Shadow DOM.
 *    We must use `getSelection()` from the element's root document, not `window.getSelection()`.
 *
 * 2. **Paste Handling**: Browsers insert rich HTML on paste by default. We intercept paste
 *    events and manually insert plain text only, respecting maxLength constraints.
 *
 * 3. **State Synchronization**: We maintain both `rawValue` (plain text) and `displayValue` (HTML).
 *    The component must carefully sync DOM changes to React state without causing cursor jumps.
 *    The `skipNextDomSync` flag prevents re-rendering the DOM immediately after user input.
 *
 * 4. **Range Tracking**: During paste operations, the selection can collapse before we process
 *    the clipboard data. We track the last non-collapsed range to handle this edge case.
 *
 * 5. **Native Event Listeners**: React's synthetic events don't always capture selection changes
 *    reliably in Shadow DOM. We use native addEventListener for selection tracking.
 *
 * @param props - Component props
 * @param ref - Forwarded ref exposing imperative methods
 * @returns A contenteditable div wrapped in a container with optional auto-sizing
 */
const ContentEditableInput = forwardRef<
  ContentEditableInputHandle,
  ContentEditableInputProps
>(
  (
    {
      ariaLabel,
      autoSize,
      disabled,
      displayValue,
      maxLength,
      rawValue,
      onBlur,
      onChange,
      onFocus,
      onKeyDown,
      placeholder,
      testId,
    },
    ref,
  ) => {
    /** Reference to the contenteditable div element */
    const editorRef = useRef<HTMLDivElement | null>(null);

    /** Reference to the hidden sizer div used for auto-height calculation */
    const sizerRef = useRef<HTMLDivElement | null>(null);

    /**
     * Flag to prevent DOM sync after emitting a change from user input.
     * Without this, we'd re-render the DOM immediately after the user types,
     * which can cause cursor position issues.
     */
    const skipNextDomSync = useRef(false);

    /** Tracks the last displayValue we synced to the DOM to avoid unnecessary updates */
    const lastDisplayValue = useRef<string>("");

    /**
     * Tracks the most recent selection range. Updated on keydown, keyup, and mouseup.
     * This is crucial for paste operations where the selection might collapse.
     */
    const lastRangeRef = useRef<Range | null>(null);

    /**
     * Tracks the last non-collapsed (text selected) range. Used as a fallback
     * during paste operations when the current selection has collapsed but we
     * still want to replace the previously selected text.
     */
    const lastNonCollapsedRangeRef = useRef<Range | null>(null);

    /**
     * Reads the current text from the DOM, enforces maxLength, and emits onChange.
     *
     * **Why read from DOM instead of tracking in state?**
     * ContentEditable elements are controlled by the browser's editing engine.
     * We let the browser handle the editing, then read the result and emit it
     * to React state. This prevents cursor jumping and editing lag.
     *
     * **MaxLength enforcement:**
     * If the text exceeds maxLength (can happen with paste), we truncate it
     * and update the DOM directly, then place the caret at the end.
     */
    const emitChangeFromDom = useCallback(() => {
      if (!editorRef.current) {
        return;
      }

      const { rawValue, displayValue, wasTruncated } = extractNormalizedText(
        editorRef.current,
        maxLength,
      );

      if (wasTruncated) {
        const selection = getSelectionForElement(editorRef.current);
        placeCaretAtEnd(editorRef.current, selection);
      }

      updateContentAttribute(editorRef.current, rawValue);
      skipNextDomSync.current = true;
      onChange({
        rawValue,
        displayValue,
      });
    }, [maxLength, onChange]);

    /**
     * Captures and stores the current selection range.
     *
     * **Why track selection?**
     * During paste operations, the browser may collapse the selection before
     * our paste handler runs. By tracking the selection on every interaction,
     * we can restore or use the last known selection during paste.
     *
     * We track both the current range and the last non-collapsed range separately
     * because paste should replace selected text if any was selected.
     */
    const captureSelection = useCallback(() => {
      if (!editorRef.current) {
        return;
      }

      const range = getSelectionRange(editorRef.current);
      if (!range) {
        return;
      }

      lastRangeRef.current = range.cloneRange();
      if (!range.collapsed) {
        lastNonCollapsedRangeRef.current = range.cloneRange();
      }
    }, []);

    /**
     * Handles native paste events to enforce plain text only pasting.
     *
     * **Why intercept paste?**
     * By default, contenteditable divs accept rich HTML on paste (bold, links, images, etc.).
     * This can break our character counting, introduce XSS vulnerabilities, and create
     * inconsistent formatting. We intercept the paste event and insert only the plain
     * text portion of the clipboard data.
     *
     * **Undo/Redo preservation:**
     * We use document.execCommand('insertText') instead of manual DOM manipulation.
     * This allows the browser to maintain its native undo/redo stack while still
     * giving us control over what gets pasted (plain text only, respecting maxLength).
     *
     * **MaxLength enforcement:**
     * We calculate how much text can be inserted based on current content length,
     * selected text length, and maxLength constraint. The text is truncated if needed
     * before insertion.
     *
     * @param event - The native clipboard event
     */
    const handleNativePaste = useCallback(
      (event: globalThis.ClipboardEvent) => {
        const element = editorRef.current;
        if (!element) {
          return;
        }

        const clipboardText = event.clipboardData?.getData("text/plain") || "";
        if (!clipboardText) {
          return;
        }

        event.preventDefault();

        // Normalize the clipboard text (convert line endings, etc.)
        const normalizedText = normalizeTextValue(clipboardText);

        // Calculate how much text we can insert based on maxLength
        const currentText = normalizeTextValue(element.innerText || "");
        const selection = getSelectionForElement(element);
        const range = getSelectionRangeForElement(element, selection);
        const selectedTextLength = range
          ? normalizeTextValue(range.toString()).length
          : 0;

        const available = calculateAvailableLength(
          currentText,
          selectedTextLength,
          maxLength,
        );

        const textToInsert = truncateToLength(normalizedText, available);

        if (!textToInsert.length) {
          return;
        }

        // Use execCommand to insert text so browser maintains undo/redo stack
        // Note: execCommand is deprecated but still widely supported and necessary
        // for undo/redo integration. There's no modern alternative that preserves
        // the undo stack when intercepting paste events.
        document.execCommand("insertText", false, textToInsert);

        // Capture the new selection state and emit the change
        captureSelection();
        emitChangeFromDom();
      },
      [captureSelection, emitChangeFromDom, maxLength],
    );

    /**
     * Sets up native event listeners for selection tracking and paste handling.
     *
     * **Why native listeners instead of React events?**
     * React's synthetic event system doesn't always work correctly inside Shadow DOM
     * (web components). Selection and clipboard events in particular can lose important
     * details when they bubble through the shadow boundary. Native addEventListener
     * works reliably in all contexts.
     *
     * We track selection on keydown, keyup, and mouseup to ensure we always have
     * the latest selection state before a paste operation.
     */
    useEffect(() => {
      const element = editorRef.current;
      if (!element) {
        return undefined;
      }

      const eventHandlers: Array<{
        type: string;
        handler: EventListener;
      }> = [
        { type: "keydown", handler: captureSelection as EventListener },
        { type: "keyup", handler: captureSelection as EventListener },
        { type: "mouseup", handler: captureSelection as EventListener },
        { type: "paste", handler: handleNativePaste as EventListener },
      ];

      // Add all event listeners
      eventHandlers.forEach(({ type, handler }) => {
        element.addEventListener(type, handler);
      });

      // Cleanup: remove all event listeners
      return () => {
        eventHandlers.forEach(({ type, handler }) => {
          element.removeEventListener(type, handler);
        });
      };
    }, [captureSelection, handleNativePaste]);

    /**
     * Exposes imperative methods to parent components via ref.
     * This allows programmatic focus management without triggering re-renders.
     */
    useImperativeHandle(ref, () => ({
      getHTMLElement: () => editorRef.current,
      takeFocus: () => {
        doFocusRef(editorRef, false, true);
      },
      doBlur: () => {
        editorRef.current?.blur();
      },
    }));

    /**
     * Manages auto-sizing behavior by measuring the sizer div and adjusting overflow.
     *
     * **How auto-sizing works:**
     * We render a hidden "sizer" div with the same content as the editor. The sizer
     * is allowed to grow naturally to measure the content height. If the content
     * exceeds MAX_AUTO_RESIZE_HEIGHT, we switch the editor to scrollable mode.
     * Otherwise, we let it grow to fit the content.
     *
     * This runs in useLayoutEffect to avoid visual flicker - the height is adjusted
     * before the browser paints.
     */
    useLayoutEffect(() => {
      if (!autoSize || !editorRef.current || !sizerRef.current) {
        return;
      }

      const sizerHeight = sizerRef.current.scrollHeight;
      if (sizerHeight > MAX_AUTO_RESIZE_HEIGHT) {
        editorRef.current.style.overflowY = "auto";
      } else {
        editorRef.current.style.overflowY = "hidden";
      }
    }, [autoSize, displayValue]);

    /**
     * Syncs external displayValue changes to the DOM without interfering with user input.
     *
     * **The synchronization challenge:**
     * We need to update the DOM when displayValue changes externally (e.g., clearing the input),
     * but NOT when the change came from the user typing (which would reset the cursor position).
     *
     * **Solution:**
     * - When emitChangeFromDom runs, it sets skipNextDomSync to true
     * - This effect sees the flag and skips the DOM update
     * - For external changes, the flag is false, so we update the DOM
     *
     * We also track lastDisplayValue to avoid unnecessary DOM updates when the value
     * hasn't actually changed.
     *
     * This runs in useLayoutEffect to ensure the DOM is updated before paint,
     * preventing visual flicker.
     */
    useLayoutEffect(() => {
      if (!editorRef.current) {
        return;
      }

      if (skipNextDomSync.current) {
        skipNextDomSync.current = false;
        lastDisplayValue.current = displayValue;
        return;
      }

      if (displayValue === lastDisplayValue.current) {
        return;
      }

      lastDisplayValue.current = displayValue;
      if (displayValue) {
        editorRef.current.innerHTML = displayValue;
      } else {
        editorRef.current.innerHTML = "";
      }
      const selection = getSelectionForElement(editorRef.current);
      placeCaretAtEnd(editorRef.current, selection);
    }, [displayValue]);

    /**
     * Updates the data-has-content attribute whenever rawValue changes.
     * This attribute is used by CSS to control placeholder visibility.
     */
    useLayoutEffect(() => {
      if (editorRef.current) {
        updateContentAttribute(editorRef.current, rawValue);
      }
    }, [rawValue]);

    /**
     * Memoize the sizer innerHTML to prevent unnecessary DOM updates.
     * The sizer content only needs to change when rawValue, displayValue, or placeholder changes.
     */
    const sizerInnerHTML = useMemo(
      () => ({
        __html:
          rawValue && rawValue.length
            ? displayValue || "&nbsp;"
            : escapeHTML(placeholder || " ") || "&nbsp;",
      }),
      [rawValue, displayValue, placeholder],
    );

    return (
      <div
        className={cx("cds-aichat--text-area", {
          "cds-aichat--text-area--auto-size": autoSize,
          "cds-aichat--text-area--disabled": disabled,
        })}
      >
        {/* The main contenteditable div that users interact with */}
        <div
          ref={editorRef}
          aria-label={ariaLabel}
          aria-multiline="true"
          className="cds-aichat--text-area-textarea"
          contentEditable={!disabled}
          data-placeholder={placeholder}
          data-testid={testId}
          aria-disabled={disabled}
          onBlur={onBlur}
          onFocus={onFocus}
          onInput={emitChangeFromDom}
          onKeyDown={onKeyDown}
          role="textbox"
          tabIndex={disabled ? -1 : 0}
          spellCheck={true}
          suppressContentEditableWarning
          // Disable browser extensions that might interfere with contenteditable
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />
        {autoSize && (
          // Hidden sizer div used to measure content height for auto-sizing.
          // It contains the same content as the editor but is allowed to grow naturally.
          <div
            ref={sizerRef}
            className="cds-aichat--text-area-sizer"
            aria-hidden
            dangerouslySetInnerHTML={sizerInnerHTML}
          />
        )}
      </div>
    );
  },
);

ContentEditableInput.displayName = "ContentEditableInput";

export { ContentEditableInput };
