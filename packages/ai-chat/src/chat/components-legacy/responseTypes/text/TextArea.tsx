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
   * The value for data-test-id for automated testing suites.
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
  private textAreaRef: RefObject<HTMLTextAreaElement> = React.createRef();

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
          <div className="cds-aichat--text-area-sizer">
            {value || placeholder || " "}
          </div>
        )}
      </div>
    );
  }
}

export default TextArea;
