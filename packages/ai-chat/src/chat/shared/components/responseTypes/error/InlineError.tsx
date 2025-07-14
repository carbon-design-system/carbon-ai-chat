/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { ErrorIcon } from "../../ErrorIcon";
import RichText from "../util/RichText";

export function InlineError({ text }: { text?: string }) {
  const languagePack = useLanguagePack();
  return (
    <div className="WAC__inlineError">
      <div className="WAC__inlineError--iconHolder">
        <ErrorIcon className="WAC__inlineError--icon" />
      </div>
      <div className="WAC__inlineError--text">
        <RichText
          shouldRemoveHTMLBeforeMarkdownConversion
          text={text || languagePack.errors_generalContent}
        />
      </div>
    </div>
  );
}

export default InlineError;
