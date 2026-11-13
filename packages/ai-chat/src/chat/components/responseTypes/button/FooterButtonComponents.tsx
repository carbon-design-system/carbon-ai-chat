/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from 'classnames';
import React from 'react';
import { useNestedMessageItems } from '../../../hooks/useDrawnMessageItems';

import { MessageTypeComponentProps } from '../../../components-legacy/MessageTypeComponentProps';

interface FooterButtonComponentsProps extends MessageTypeComponentProps {
  renderMessageComponent: (
    props: MessageTypeComponentProps & {
      isNestedMessageItem: boolean;
    }
  ) => React.ReactNode;
}

/**
 * This component handles rendering button response types in the footer of a container, under "body" content. See
 * {@link #BodyMessageComponents}.
 */
function FooterButtonComponents(props: FooterButtonComponentsProps) {
  const nestedItems = useNestedMessageItems(
    props.message.ui_state.id,
    'footer'
  );
  const buttonComponents = nestedItems.map(
    ({ localMessageItem: nestedLocalMessage }) => {
      const nestedMessageID = nestedLocalMessage.ui_state.id;
      // Build a local view object that does not mutate the store state, the `is: 'standard-button'` override is a rendering concern only
      const messageWithStandardButton = {
        ...nestedLocalMessage,
        item: { ...nestedLocalMessage.item, is: 'standard-button' as const },
      };
      return (
        <React.Fragment key={nestedMessageID}>
          {props.renderMessageComponent({
            ...props,
            message: messageWithStandardButton,
            isNestedMessageItem: true,
          })}
        </React.Fragment>
      );
    }
  );
  const totalButtons = buttonComponents.length;
  const isColumnList = totalButtons > 2;

  return totalButtons ? (
    <div
      className={cx('cds-aichat--footer-button-components', {
        'cds-aichat--footer-button-components--column': isColumnList,
      })}>
      {buttonComponents}
    </div>
  ) : null;
}

export { FooterButtonComponents };
