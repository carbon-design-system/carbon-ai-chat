/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import cx from "classnames";
import React, { ReactNode } from "react";

import VisuallyHidden from "../../util/VisuallyHidden";

interface TextHolderTileProps {
  /**
   * The title of the card.
   */
  title?: ReactNode;

  /**
   * A description of the card.
   */
  description?: string | ReactNode;

  /**
   * The url to display on the tile.
   */
  displayURL?: string;

  /**
   * A urlHostName for the iframe.
   */
  urlHostName?: string;

  /**
   * Indicates if the title should be hidden.
   */
  hideTitle?: boolean;
}

/**
 * This component renders the Textual part of the cards - more specifically Title, description, favicon URL
 * or default fallback icon. In the case of Iframes, this also renders the URL part. Also renders a launch icon in
 * the case of text-only cards
 */
function TextHolderTile({
  title,
  description,
  displayURL,
  urlHostName,
  hideTitle,
}: TextHolderTileProps) {
  return (
    <div className="WACTextHolderTile">
      <div
        className={cx("WACTextHolderTile__Wrapper", "WACWidget__textEllipsis", {
          WACTextHolderTile__IconMargin: !displayURL,
        })}
      >
        {!hideTitle && title && (
          <div className="WACTextHolderTile__Title">{title}</div>
        )}
        {description && (
          <div
            className={cx("WACTextHolderTile__Description", {
              WACTextHolderTile__DescriptionMargin: title,
            })}
          >
            {description}
          </div>
        )}
        {displayURL && (
          <>
            <VisuallyHidden>{urlHostName}</VisuallyHidden>
            <div
              className={cx(
                "WACTextHolderTile__Url",
                "WACWidget__textEllipsis",
                {
                  WACTextHolderTile__UrlMargin: title || description,
                }
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

export { TextHolderTile };
