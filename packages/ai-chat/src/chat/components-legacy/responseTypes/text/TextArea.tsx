/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * This file contains a text area component which, if specified, will resize its height to match its content.
 *
 * To perform the auto-size functionality, this component will render a second hidden element that is underneath the
 * text area that has the same text content as the text area. This hidden component will set the size of the container
 * element. The textarea itself is set to width/height of 100% which means it will size automatically to the container.
 *
 * This works without needed any javascript to maintain the textarea but the downside is that the styling of the
 * textarea must match the hidden area. If you find your textarea is either too big or too small, then check to make
 * sure the styling for the two components matches.
 */

import cx from "classnames";
import React, {
  ChangeEvent,
  KeyboardEventHandler,
  PureComponent,
  ReactEventHandler,
  RefObject,
  SyntheticEvent,
} from "react";

import { doFocusRef } from "../../../utils/domUtils";

interface TextAreaProps {
  /**
   * An ID to attach to a text area element. Useful for associating labels to text areas.
   */
  id?: string;

  /**
   * Whether input in the text area is required before form submission.
   */
  isRequired?: boolean;

  /**
   * The name of the text area for parsing form data.
   */
  name?: string;

  /**
   * An on change event to handle when a value within the text area changes.
   */
  onChange?: (event: ChangeEvent<HTMLTextAreaElement>) => void;

  /**
   * A focus event to handle when the text area gains focus.
   */
  onFocus?: (event: SyntheticEvent) => void;

  /**
   * A blur event to handle when the text area loses focus.
   */
  onBlur?: (event: SyntheticEvent) => void;

  /**
   * A click event to handle when the text area receives a click event.
   */
  onClick?: (event: SyntheticEvent) => void;

  /**
   * The callback to call when a keydown event occurs.
   */
  onKeyDown?: KeyboardEventHandler;

  /**
   * The callback to call when a select event occurs.
   */
  onSelect?: ReactEventHandler<HTMLTextAreaElement>;

  /**
   * Placeholder text to be rendered within the text area when no information is inputted.
   */
  placeholder?: string;

  /**
   * The number of rows the text area should take up.
   */
  rows?: number;

  /**
   * The current value of the text area.
   */
  value?: string;

  /**
   * Indicates whether the text area should automatically resize.
   */
  autoSize?: boolean;

  /**
   * Maximum number of characters permitted by the textarea.
   */
  maxLength?: number;

  /**
   * Indicates if the textarea should be set as disabled.
   */
  disabled?: boolean;

  /**
   * The value to add for the aria-label attribute on the textarea.
   */
  ariaLabel?: string;

  /**
   * The value for data-testid for automated testing suites.
   */
  testId?: string;
}

class TextArea extends PureComponent<TextAreaProps> {
  static defaultProps = {
    // Default value for whether input in the text area is required before form submission.
    isRequired: false,

    // Default max character length for a text area is 10,000 characters.
    maxLength: 10000,
  };

  /**
   * A React ref to the TextArea component.
   */
  private textAreaRef: RefObject<HTMLTextAreaElement | null> =
    React.createRef();

  /**
   * A React ref to the sizer component.
   * Used to calculate the required height for the textarea content and determine when scrolling is needed.
   */
  private sizerRef: RefObject<HTMLDivElement | null> = React.createRef();

  /**
   * Returns the HTML element.
   */
  public getHTMLElement() {
    return this.textAreaRef.current;
  }

  /**
   * Instructs this component to put focus into the input text area.
   */
  public takeFocus() {
    doFocusRef(this.textAreaRef, false, true);
  }

  /**
   * Causes the text area to blur.
   */
  doBlur() {
    this.textAreaRef.current.blur();
  }

  /**
   * Updates textarea overflow based on whether content exceeds max height.
   *
   * This method prevents scrollbar flashing during textarea auto-resize by:
   * 1. Measuring the actual content height using the hidden sizer div
   * 2. Comparing it against the max-block-size limit (157px) defined in Input.scss
   * 3. Only enabling scrolling when content actually exceeds the maximum height
   *
   * This ensures smooth resizing without premature scrollbar appearance.
   */
  updateOverflow() {
    if (
      !this.props.autoSize ||
      !this.textAreaRef.current ||
      !this.sizerRef.current
    ) {
      return;
    }

    const sizerHeight = this.sizerRef.current.scrollHeight;
    const maxHeight = 157; // max-block-size from Input.scss lines 187-188

    if (sizerHeight > maxHeight) {
      this.textAreaRef.current.style.overflow = "auto";
    } else {
      this.textAreaRef.current.style.overflow = "hidden";
    }
  }

  componentDidUpdate() {
    // Re-evaluate scrollbar necessity whenever component updates (e.g., value changes)
    this.updateOverflow();
  }

  componentDidMount() {
    // Initial scrollbar evaluation when component first renders
    this.updateOverflow();
  }

  render() {
    const {
      isRequired,
      name,
      id,
      onFocus,
      onBlur,
      onClick,
      onChange,
      onKeyDown,
      rows,
      value,
      autoSize,
      maxLength,
      disabled,
      placeholder,
      ariaLabel,
      testId,
      onSelect,
    } = this.props;

    // The extra ' ' in the sizer div below makes sure there's at least a space in the area to ensure that we get a
    // min-height of one line of text.
    return (
      <div
        className={cx("cds-aichat--text-area", {
          "cds-aichat--text-area--auto-size": autoSize,
          "cds-aichat--text-area--disabled": disabled,
        })}
      >
        <textarea
          ref={this.textAreaRef}
          aria-label={ariaLabel}
          aria-required={isRequired}
          className="cds-aichat--text-area-textarea"
          disabled={disabled}
          id={id || testId}
          maxLength={maxLength}
          name={name}
          onFocus={onFocus}
          onBlur={onBlur}
          onClick={onClick}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onSelect={onSelect}
          placeholder={placeholder}
          rows={rows}
          value={value || ""}
          // Disable Grammarly because it overlays the chat
          // https://github.com/facebook/draft-js/issues/616#issuecomment-343596615
          data-gramm="false"
          data-gramm_editor="false"
          data-enable-grammarly="false"
          data-testid={testId}
        />
        {autoSize && (
          <div ref={this.sizerRef} className="cds-aichat--text-area-sizer">
            {/*
              Split text content by newlines and render each line properly for height calculation.

              Key improvements made:
              1. Split on '\n' to handle carriage returns correctly
              2. Use non-breaking space (\u00A0) for empty lines to prevent line collapse
              3. Insert <br /> tags between lines to maintain proper line spacing

              This ensures accurate height measurement for the sizer, which is critical for:
              - Proper textarea auto-resizing
              - Correct scrollbar detection when content exceeds max height (157px)
              - Handling edge cases like multiple consecutive newlines
            */}
            {(value || placeholder || " ")
              .split("\n")
              .map((line, index, array) => (
                <React.Fragment key={index}>
                  {line || "\u00A0"}
                  {index < array.length - 1 && <br />}
                </React.Fragment>
              ))}
          </div>
        )}
      </div>
    );
  }
}

export default TextArea;
