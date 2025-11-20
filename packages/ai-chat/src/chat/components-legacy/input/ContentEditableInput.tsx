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
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import { doFocusRef } from "../../utils/domUtils";

const MAX_AUTO_RESIZE_HEIGHT = 180;

export type ContentEditableChange = {
  rawValue: string;
  displayValue: string;
};

export interface ContentEditableInputProps {
  ariaLabel?: string;
  autoSize?: boolean;
  disabled?: boolean;
  displayValue: string;
  maxLength: number;
  rawValue: string;
  onBlur?: (event: FocusEvent<HTMLDivElement>) => void;
  onChange: (value: ContentEditableChange) => void;
  onFocus?: (event: FocusEvent<HTMLDivElement>) => void;
  onKeyDown?: (event: KeyboardEvent<HTMLDivElement>) => void;
  placeholder?: string;
  testId?: string;
}

export interface ContentEditableInputHandle {
  getHTMLElement: () => HTMLDivElement | null;
  takeFocus: () => void;
  doBlur: () => void;
}

function normalizeTextValue(value: string) {
  return value.replace(/\r\n?/g, "\n").replace(/\u00a0/g, " ");
}

function escapeHTML(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toDisplayHTML(value: string) {
  const escaped = escapeHTML(value);
  return escaped.replace(/\n/g, "<br>");
}

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
    const editorRef = useRef<HTMLDivElement | null>(null);
    const sizerRef = useRef<HTMLDivElement | null>(null);
    const skipNextDomSync = useRef(false);
    const lastDisplayValue = useRef<string>("");

    function setHasContentData(value: string) {
      if (!editorRef.current) {
        return;
      }

      editorRef.current.dataset.hasContent = value ? "true" : "false";
    }

    function emitChangeFromDom() {
      if (!editorRef.current) {
        return;
      }

      const textValue = normalizeTextValue(editorRef.current.innerText || "");
      let nextValue = textValue;

      if (maxLength && nextValue.length > maxLength) {
        nextValue = nextValue.slice(0, maxLength);
        editorRef.current.innerText = nextValue;
        placeCaretAtEnd(editorRef.current);
      }

      setHasContentData(nextValue);
      skipNextDomSync.current = true;
      onChange({
        rawValue: nextValue,
        displayValue: toDisplayHTML(nextValue),
      });
    }

    function handleInput() {
      emitChangeFromDom();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
      onKeyDown?.(event);
    }

    function handleFocus(event: FocusEvent<HTMLDivElement>) {
      onFocus?.(event);
    }

    function handleBlur(event: FocusEvent<HTMLDivElement>) {
      onBlur?.(event);
    }

    useImperativeHandle(ref, () => ({
      getHTMLElement: () => editorRef.current,
      takeFocus: () => {
        doFocusRef(editorRef, false, true);
      },
      doBlur: () => {
        editorRef.current?.blur();
      },
    }));

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
      placeCaretAtEnd(editorRef.current);
    }, [displayValue]);

    useLayoutEffect(() => {
      setHasContentData(rawValue);
    }, [rawValue]);

    return (
      <div
        className={cx("cds-aichat--text-area", {
          "cds-aichat--text-area--auto-size": autoSize,
          "cds-aichat--text-area--disabled": disabled,
        })}
      >
        <div
          ref={editorRef}
          aria-label={ariaLabel}
          aria-multiline="true"
          className="cds-aichat--text-area-textarea"
          contentEditable={!disabled}
          data-placeholder={placeholder}
          data-testid={testId}
          aria-disabled={disabled}
          onBlur={handleBlur}
          onFocus={handleFocus}
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          role="textbox"
          tabIndex={disabled ? -1 : 0}
          spellCheck={true}
          suppressContentEditableWarning
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
        />
        {autoSize && (
          <div
            ref={sizerRef}
            className="cds-aichat--text-area-sizer"
            aria-hidden
            dangerouslySetInnerHTML={{
              __html:
                rawValue && rawValue.length
                  ? displayValue || "&nbsp;"
                  : escapeHTML(placeholder || " ") || "&nbsp;",
            }}
          />
        )}
      </div>
    );
  },
);

ContentEditableInput.displayName = "ContentEditableInput";

function placeCaretAtEnd(element: HTMLDivElement) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(element);
  range.collapse(false);
  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

export { ContentEditableInput };
