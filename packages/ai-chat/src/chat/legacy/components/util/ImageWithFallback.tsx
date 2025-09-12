/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useEffect, useState } from "react";

interface ImageWithFallbackProps {
  /**
   * The URL to load into the image.
   */
  url: string;

  /**
   * The alt attribute to include on the image.
   */
  alt?: string;

  /**
   * The render prop to call when the image fails to load.
   */
  fallback: React.ReactNode;
}

function ImageWithFallback(props: ImageWithFallbackProps) {
  const { url, alt, fallback } = props;

  // Indicates if the image failed to load.
  const [hasError, setHasError] = useState(false);

  // If the url changes, then hasError should reset to allow an attempt at loading the new image.
  useEffect(() => {
    setHasError(false);
  }, [url]);

  let component;
  if (!hasError && url) {
    component = <img src={url} alt={alt} onError={() => setHasError(true)} />;
  } else {
    component = fallback;
  }

  return <div className="cds-aichat--image-with-fallback">{component}</div>;
}

export { ImageWithFallback };
