/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Tile from "../../../components/carbon/Tile";
import cx from "classnames";
import AISkeletonPlaceholder from "../../../components/carbon/AISkeletonPlaceholder";
import SkeletonPlaceholder from "../../../components/carbon/SkeletonPlaceholder";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { useAriaAnnouncer } from "../../../hooks/useAriaAnnouncer";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { HasNeedsAnnouncement } from "../../../../types/utilities/HasNeedsAnnouncement";
import { getURLHostName } from "../../../utils/browserUtils";
import { RESPONSE_TYPE_TIMEOUT_MS } from "../../../utils/constants";
import InlineError from "../error/InlineError";
import { TextHolderTile } from "../util/TextHolderTile";

interface ImageProps extends HasNeedsAnnouncement, HasClassName {
  source: string;
  title?: string;
  description?: string;
  altText: string;
  imageError?: string;

  /**
   * The url to display on the image tile.
   */
  displayURL?: string;

  /**
   * Indicates if the icon and title should be hidden.
   */
  hideIconAndTitle?: boolean;

  /**
   * The svg icon to render in the button.
   */
  renderIcon?: React.ElementType;

  /**
   * This will prevent the inline error from rendering when the image fails to load. This only works if there is
   * text to display (title, description, or url).
   */
  preventInlineError?: boolean;

  /**
   * The callback function to fire when the image loads.
   */
  onImageLoad?: () => void;

  /**
   * If it should use the AI theme for skeletons.
   */
  useAITheme?: boolean;

  /**
   * If the image should be displayed inline with no tile. Used in RichTextBeta.
   */
  inline?: boolean;
}

function Image(props: ImageProps) {
  const {
    imageError,
    title,
    description,
    displayURL,
    hideIconAndTitle,
    needsAnnouncement,
    renderIcon,
    inline,
  } = props;
  const ariaAnnouncer = useAriaAnnouncer();
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const rootRef = useRef();
  // This ref is for merely saving the initial value of shouldAnnounce prop.
  const needsAnnouncementRef = useRef(needsAnnouncement);
  const hasText = Boolean(title || description || displayURL);

  const Icon = renderIcon;

  // This effect announces the contents of this response type once the image has loaded.
  useEffect(() => {
    if (isLoaded && needsAnnouncementRef.current) {
      ariaAnnouncer(rootRef.current);
    }
  }, [ariaAnnouncer, isLoaded]);

  if (isError) {
    return <InlineError text={imageError} />;
  }

  if (inline) {
    return (
      <ImageOnly
        {...props}
        setIsError={setIsError}
        setIsLoaded={setIsLoaded}
        isError={isError}
        isLoaded={isLoaded}
      />
    );
  }

  return (
    <Tile
      ref={rootRef}
      className={cx("cds-aichat--image", {
        "cds-aichat--image__text-and-icon": hasText && Boolean(renderIcon),
        "cds-aichat--image__icon-only":
          !hideIconAndTitle && !title && !description && Boolean(renderIcon),
      })}
    >
      <div className="cds-aichat--image__image-wrapper">
        <ImageOnly
          {...props}
          setIsError={setIsError}
          setIsLoaded={setIsLoaded}
          isError={isError}
          isLoaded={isLoaded}
        />
      </div>
      {hasText && (
        <TextHolderTile
          title={title}
          description={description}
          displayURL={displayURL}
          urlHostName={displayURL && getURLHostName(displayURL)}
          hideTitle={hideIconAndTitle}
        />
      )}
      {Boolean(Icon) && (
        <Icon
          className={cx(
            "cds-aichat--image__icon",
            "cds-aichat--direction-has-reversible-svg",
            {
              "cds-aichat--image__icon--link": displayURL,
            },
          )}
        />
      )}
    </Tile>
  );
}

interface ImageOnlyProps extends Partial<ImageProps> {
  isLoaded: boolean;
  isError: boolean;
  setIsLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  setIsError: React.Dispatch<React.SetStateAction<boolean>>;
}

function ImageOnly({
  source,
  title,
  description,
  altText,
  displayURL,
  preventInlineError,
  onImageLoad,
  useAITheme,
  isLoaded,
  isError,
  setIsLoaded,
  setIsError,
  className,
  inline,
}: ImageOnlyProps) {
  const [isImageHidden, setIsImageHidden] = useState(false);
  const imageAlt = altText || title || description || "";
  const hasText = Boolean(title || description || displayURL);

  /**
   * Upon an error, update the error loading flag in order to render an inline error.
   */
  const handleError = useCallback(() => {
    if (preventInlineError && hasText) {
      setIsImageHidden(true);
    } else {
      setIsError(true);
    }
  }, [preventInlineError, hasText, setIsError]);

  // This effect sets a timeout that auto error handles after 10 seconds of waiting for the image to load. Once the
  // image has loaded, the skeleton will be hidden, and we can clear the timeout.
  useEffect(() => {
    let errorTimeout: ReturnType<typeof setTimeout> = null;
    if (!isLoaded) {
      errorTimeout = setTimeout(handleError, RESPONSE_TYPE_TIMEOUT_MS);
    }

    return () => {
      clearTimeout(errorTimeout);
    };
  }, [isLoaded, handleError]);

  return (
    <>
      {!isLoaded &&
        !isImageHidden &&
        !inline &&
        source &&
        (useAITheme ? (
          <AISkeletonPlaceholder className="cds-aichat--image__skeleton" />
        ) : (
          <SkeletonPlaceholder className="cds-aichat--image__skeleton" />
        ))}
      {!isError && !isImageHidden && source && (
        <img
          className={cx("cds-aichat--image__image", {
            [className]: className,
            "cds-aichat--image__image--loaded": isLoaded,
          })}
          src={source}
          alt={imageAlt}
          onLoad={() => {
            onImageLoad?.();
            setIsLoaded(true);
          }}
          onError={handleError}
        />
      )}
    </>
  );
}

const ImageExport = React.memo(Image);

export { ImageProps, ImageExport as Image };
