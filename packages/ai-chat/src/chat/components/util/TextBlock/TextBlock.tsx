/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
import React, { ReactNode } from 'react';
import cx from 'classnames';
import { HasClassName } from '../../../../types/utilities/HasClassName';
import VisuallyHidden from '../VisuallyHidden';
import { MarkdownWithDefaults } from '../MarkdownWithDefaults';

export enum RENDER_MODE {
  MARKDOWN = 'markdown',
  RAW = 'raw',
}

type StringOrReactNode = string | ReactNode;

interface TextBlockProps extends HasClassName {
  // Optional ID (from Metablock)
  id?: string;

  // Content
  title?: StringOrReactNode;
  description?: StringOrReactNode;

  // Rendering mode
  renderMode?: RENDER_MODE;

  // URL display (previously from TextHolderTile)
  /**
   * The url to display on the tile.
   */
  displayURL?: string;
  /**
   * A urlHostName for the iframe.
   */
  urlHostName?: string;

  // Styling
  hideTitle?: boolean;

  // Markdown options
  /**
   * Indicates if HTML should be removed from text before converting Markdown to HTML.
   * This is used to sanitize data coming from a human agent.
   */
  removeHTML?: boolean;
}

export function TextBlock({
  id,
  title,
  description,
  renderMode = RENDER_MODE.RAW,
  displayURL,
  urlHostName,
  hideTitle,
  removeHTML,
  className,
}: TextBlockProps) {
  const renderContent = (content: StringOrReactNode) => {
    if (renderMode === RENDER_MODE.MARKDOWN && typeof content === 'string') {
      return <MarkdownWithDefaults text={content} removeHTML={removeHTML} />;
    }
    return content;
  };

  return (
    <div className={cx('cds-aichat--text-block', className)} id={id}>
      <div
        className={cx(
          'cds-aichat--text-holder-tile__wrapper',
          'cds-aichat--widget__text-ellipsis',
          {
            'cds-aichat--text-holder-tile__icon-margin': !displayURL,
          },
        )}
      >
        {!hideTitle && title && (
          <div className="cds-aichat--text-block__title">
            {renderContent(title)}
          </div>
        )}
        {description && (
          <div
            className={cx('cds-aichat--text-block__description', {
              'cds-aichat--text-block__description-margin': title,
            })}
          >
            {renderContent(description)}
          </div>
        )}
        {displayURL && (
          <>
            <VisuallyHidden>{urlHostName}</VisuallyHidden>
            <div
              className={cx(
                'cds-aichat--text-block__url cds-aichat--widget__text-ellipsis',
                {
                  'cds-aichat--text-block__url-margin': title || description,
                },
              )}
              aria-hidden
            >
              {displayURL}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
