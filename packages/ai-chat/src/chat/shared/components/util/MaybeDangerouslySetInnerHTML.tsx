/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { useShouldSanitizeHTML } from "../../hooks/useShouldSanitizeHTML";
import { HasClassName } from "../../../../types/utilities/HasClassName";
import { HasID } from "../../../../types/utilities/HasID";
import { sanitizeHTML } from "../../utils/htmlUtils";

interface MaybeDangerouslySetInnerHTMLProps extends HasClassName, HasID {
  /**
   * The HTML to render.
   */
  html: string;

  /**
   * If defined, this value indicates if this component should override the default sanitization setting.
   */
  overrideSanitize?: boolean;

  /**
   * Indicates if the component should be rendered using a span instead of a div.
   */
  asSpan?: boolean;
}

/**
 * This component will render the given HTML using dangerouslySetInnerHTML, but it will sanitize the content first.
 *
 * This was added as an emergency fix to deal with the fact that the Carbon AI chat is susceptible to script injection
 * attacks from a tooling author. For the Carbon AI chat this is normally not a problem as we can trust a company's
 * employees to not attack themselves. However, in the case of the preview link which is hosted on ibm.com and
 * requires no authentication to access, all of ibm.com is vulnerable. So we need to avoid being dangerous for ibm.com.
 */
function MaybeDangerouslySetInnerHTML({
  html,
  overrideSanitize,
  className,
  id,
  asSpan,
}: MaybeDangerouslySetInnerHTMLProps) {
  let doSanitize = useShouldSanitizeHTML();
  if (overrideSanitize !== undefined) {
    doSanitize = overrideSanitize;
  }

  if (doSanitize) {
    html = sanitizeHTML(html);
  }

  if (asSpan) {
    // eslint-disable-next-line react/no-danger
    return (
      <span
        id={id}
        className={className}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  // eslint-disable-next-line react/no-danger
  return (
    <div
      id={id}
      className={className}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

const MaybeDangerouslySetInnerHTMLExport = React.memo(
  MaybeDangerouslySetInnerHTML
);
export { MaybeDangerouslySetInnerHTMLExport as MaybeDangerouslySetInnerHTML };
