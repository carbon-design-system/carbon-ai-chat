/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Loading from "../../../components/carbon/Loading";
import React, { useCallback, useEffect, useState } from "react";

import { useAriaAnnouncer } from "../../../hooks/useAriaAnnouncer";
import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { RESPONSE_TYPE_TIMEOUT_MS } from "../../../utils/constants";
import { MountChildrenOnDelay } from "../../../components/util/MountChildrenOnDelay";
import InlineError from "../error/InlineError";

interface IFrameComponentProps {
  /**
   * The url to load in the iframe.
   */
  source: string;

  /**
   * The title of the page that will be loaded in the iframe.
   */
  title: string;

  /**
   * The callback function that will override the component's default timeout behavior and prevent it from going into
   * its default error state. This means you'll have to create a custom error state for this component.
   */
  onTimeoutOverride?: () => void;

  /**
   * The callback function to fire when the iframe has loaded.
   */
  onLoad?: () => void;
}

/**
 * This component renders an iframe element for the iframe response type with preconfigured sandbox permissions.
 *
 * Here is a list of attributes of iframe sandbox
 * https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe#attr-sandbox
 *
 * allow-scripts: Lets the resource run scripts (but not create popup windows).
 * allow-download: Allows for downloads to occur with a gesture from the user.
 * allow-forms: Allows the resource to submit forms. If this keyword is not used, form submission is blocked.
 * allow-same-origin: Allows for the resource to access its own data storage/cookies and some JavaScript APIs
 *
 * Note: The iframe element will not fire the onerror event listener if it fails to load the source. It will still fire
 * onload, and so we aren't able to easily determine how to display an error message. We will have to rely on browsers
 * to display a native error message, which some browsers already do.
 */
function IFrameComponent({
  title,
  source,
  onTimeoutOverride,
  onLoad,
}: IFrameComponentProps) {
  const { errors_iframeSource, iframe_ariaSourceLoaded } = useLanguagePack();
  const ariaAnnouncer = useAriaAnnouncer();
  const [showSpinner, setShowSpinner] = useState(true);
  const [showError, setShowError] = useState(false);

  /**
   * Hide the spinner amd show/announce the error message.
   */
  const handleIFrameTimeout = useCallback(() => {
    setShowSpinner(false);
    setShowError(true);
    ariaAnnouncer(errors_iframeSource);
  }, [ariaAnnouncer, errors_iframeSource]);

  /**
   * Hide the spinner and announce the iframe loaded once it's ready.
   */
  const handleIFrameLoaded = useCallback(() => {
    setShowSpinner(false);
    ariaAnnouncer(iframe_ariaSourceLoaded);
    onLoad?.();
  }, [ariaAnnouncer, iframe_ariaSourceLoaded, onLoad]);

  // This effect sets a timeout that auto error handles after 10 seconds of waiting for the React player to ready.
  // Once the player has loaded, the skeleton will be hidden, and we can clear the timeout.
  useEffect(() => {
    let errorTimeout: ReturnType<typeof setTimeout> = null;
    if (showSpinner) {
      const timeoutHandler = onTimeoutOverride || handleIFrameTimeout;
      errorTimeout = setTimeout(timeoutHandler, RESPONSE_TYPE_TIMEOUT_MS);
    }

    return () => {
      clearTimeout(errorTimeout);
    };
  }, [showSpinner, handleIFrameTimeout, onTimeoutOverride]);

  return (
    <div className="cds-aichat--i-frame-component__wrapper">
      {showError && renderErrorMessage(errors_iframeSource)}
      {!showError && (
        <iframe
          className="cds-aichat--i-frame-component__i-frame"
          title={title}
          src={source}
          sandbox="allow-scripts allow-downloads allow-forms allow-popups allow-same-origin"
          referrerPolicy="origin"
          role="application"
          // Allow keyboard users to access iframe content - required for accessibility
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onLoad={handleIFrameLoaded}
        />
      )}
      {showSpinner && renderLoadingSpinner()}
    </div>
  );
}

function renderLoadingSpinner() {
  return (
    <MountChildrenOnDelay delay={1500}>
      <div className="cds-aichat--i-frame-component__status-container">
        <Loading active overlay={false} />
      </div>
    </MountChildrenOnDelay>
  );
}

function renderErrorMessage(errorText: string) {
  return (
    <div className="cds-aichat--i-frame-component__status-container">
      <InlineError text={errorText} />
    </div>
  );
}

export { IFrameComponent };
