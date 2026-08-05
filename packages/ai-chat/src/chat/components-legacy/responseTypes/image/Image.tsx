/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Card from '@carbon/ai-chat-components/es/react/card.js';
import cx from 'classnames';
import React, { useCallback, useEffect, useState } from 'react';
import VisuallyHidden from '../../../components/helpers/VisuallyHidden/VisuallyHidden';
import { HasClassName } from '../../../../types/utilities/HasClassName';
import { getURLHostName } from '../../../utils/browserUtils';
import { RESPONSE_TYPE_TIMEOUT_MS } from '../../../utils/constants';
import InlineError from '../../../components/responseTypes/error/InlineError';
import { TextBlock } from '../../../components/helpers/TextBlock/TextBlock';

interface ClickableImageProps {
  /**
   * The button alt-text.
   */
  buttonAltText?: string;

  /**
   * Indicates if the component should render as a link instead of a button.
   */
  isLink?: boolean;

  /**
   * Indicates if the component should be in the disabled state.
   */
  disabled?: boolean;

  /**
   * The callback function to fire when the component is clicked.
   */
  onClick?: () => void;

  /**
   * Where to open the link. The default target is _self.
   */
  target?: string;

  /**
   * The rel or "relationship" attribute to set on the <a> tag if `isLink` is set to true.
   * Defaults to 'noopener noreferrer' if not passed in.
   */
  rel?: string;
}

interface ImageProps extends ClickableImageProps, HasClassName {
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
   * If the image should be displayed inline with no tile.
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
    renderIcon,
    inline,
    buttonAltText,
    isLink,
    disabled,
    onClick,
    target,
    rel = 'noopener noreferrer',
  } = props;
  const [isLoaded, setIsLoaded] = useState(false);
  const [isError, setIsError] = useState(false);

  const hasText = Boolean(title || description || displayURL);

  const Icon = renderIcon;

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

  const baseImageCard = (
    <Card
      className={cx('cds-aichat--image', {
        'cds-aichat--image__text-and-icon': hasText && Boolean(renderIcon),
        'cds-aichat--image__icon-only':
          !hideIconAndTitle && !title && !description && Boolean(renderIcon),
      })}>
      <div slot="media" className="cds-aichat--image__image-wrapper">
        <ImageOnly
          {...props}
          setIsError={setIsError}
          setIsLoaded={setIsLoaded}
          isError={isError}
          isLoaded={isLoaded}
        />
      </div>
      <div slot="body">
        {hasText && (
          <TextBlock
            isInTile
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
              'cds-aichat--image__icon',
              'cds-aichat--direction-has-reversible-svg',
              {
                'cds-aichat--image__icon--link': displayURL,
              }
            )}
          />
        )}
      </div>
    </Card>
  );

  if (isLink) {
    return (
      <a
        className="cds-aichat--clickable-image"
        href={displayURL}
        rel={rel}
        target={target}
        onClick={onClick}>
        {baseImageCard}
        {buttonAltText && <VisuallyHidden>{buttonAltText}</VisuallyHidden>}
      </a>
    );
  }

  if (onClick) {
    return (
      <button
        className="cds-aichat--clickable-image"
        type="button"
        onClick={onClick}
        disabled={disabled}>
        {baseImageCard}
        {buttonAltText && <VisuallyHidden>{buttonAltText}</VisuallyHidden>}
      </button>
    );
  }

  return baseImageCard;
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
  isLoaded,
  isError,
  setIsLoaded,
  setIsError,
  className,
}: ImageOnlyProps) {
  const [isImageHidden, setIsImageHidden] = useState(false);
  const imageAlt = altText || title || description || '';
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
  // image has loaded, we can clear the timeout.
  useEffect(() => {
    let errorTimeout: ReturnType<typeof setTimeout> = null;
    if (!isLoaded) {
      errorTimeout = setTimeout(handleError, RESPONSE_TYPE_TIMEOUT_MS);
    }

    return () => {
      clearTimeout(errorTimeout);
    };
  }, [isLoaded, handleError]);

  if (isError || isImageHidden || !source) {
    return null;
  }

  return (
    <img
      className={cx('cds-aichat--image__image', {
        [className]: className,
        'cds-aichat--image__image--loaded': isLoaded,
      })}
      src={source}
      alt={imageAlt}
      onLoad={() => {
        onImageLoad?.();
        setIsLoaded(true);
      }}
      onError={handleError}
    />
  );
}

const ImageExport = React.memo(Image);

export { ImageProps, ImageExport as Image };
