/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import ErrorFilled16 from "@carbon/icons/es/error--filled/16.js";
import cx from "classnames";
import React from "react";

import { useLanguagePack } from "../../../hooks/useLanguagePack";
import { carbonIconToReact } from "../../../utils/carbonIcon";
import { MarkdownWithDefaults } from "../../../components/util/MarkdownWithDefaults";

const ErrorFilled = carbonIconToReact(ErrorFilled16);

export function InlineError({ text }: { text?: string }) {
  const languagePack = useLanguagePack();
  return (
    <div className="cds-aichat--inline-error">
      <div className="cds-aichat--inline-error--icon-holder">
        <ErrorFilled
          className={cx(
            "cds-aichat--error-icon",
            "cds-aichat--inline-error--icon",
          )}
        />
      </div>
      <div className="cds-aichat--inline-error--text">
        <MarkdownWithDefaults
          removeHTML
          text={text || languagePack.errors_generalContent}
          highlight={true}
        />
      </div>
    </div>
  );
}

export default InlineError;
