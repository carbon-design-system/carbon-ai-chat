/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React from "react";

import { useSelector } from "../../hooks/useSelector";
import { shallowEqual } from "../../store/appStore";
import { ErrorIcon } from "./ErrorIcon";
import { MarkdownWithDefaults } from "./MarkdownWithDefaults";
import { AppState } from "../../../types/state/AppState";

export function InlineError({ text }: { text?: string }) {
  const languagePack = useSelector(
    (state: AppState) => ({
      errors_generalContent: state.languagePack.errors_generalContent,
    }),
    shallowEqual,
  );
  return (
    <div className="cds-aichat--inline-error">
      <div className="cds-aichat--inline-error--icon-holder">
        <ErrorIcon className="cds-aichat--inline-error--icon" />
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
