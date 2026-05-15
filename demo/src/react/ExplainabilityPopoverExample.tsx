/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/ai-chat/css/chat-explainability-popover.css";
import React from "react";
import { Launch } from "@carbon/icons-react";
import {
  BUTTON_KIND,
  BUTTON_SIZE,
} from "@carbon/web-components/es/components/button/button.js";
import {
  TAG_SIZE,
  TAG_TYPE,
} from "@carbon/web-components/es/components/tag/tag.js";
import AILabelActionButton from "../../../packages/ai-chat/src/chat/components/carbon/AILabelActionButton";
import IconButton from "../../../packages/ai-chat/src/chat/components/carbon/IconButton";
import Link from "../../../packages/ai-chat/src/chat/components/carbon/Link";
import Tag from "../../../packages/ai-chat/src/chat/components/carbon/Tag";
import { carbonIconToReact } from "../../../packages/ai-chat/src/chat/utils/carbonIcon";
import Folders16 from "@carbon/icons/es/folders/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import View16 from "@carbon/icons/es/view/16.js";

const FoldersIcon = carbonIconToReact(Folders16);
const OpenFolderIcon = carbonIconToReact(FolderOpen16);
const ViewIcon = carbonIconToReact(View16);

function ExplainabilityPopoverContent() {
  return (
    <div
      role="dialog"
      slot="body-text"
      className="cds-aichat-explainability-popover--content"
    >
      <header className="cds-aichat-explainability-popover--content__header">
        <div className="cds-aichat-explainability-popover--content__eyebrow-row">
          <span className="cds-aichat-explainability-popover--content__label">
            AI explained
          </span>
          <Tag
            className="cds-aichat--header__slug-confidence"
            size={TAG_SIZE.SMALL}
            type={"outline" as TAG_TYPE}
          >
            Confidence: 89%
          </Tag>
        </div>
        <h2 className="cds-aichat-explainability-popover--content__title">
          Name of feature
        </h2>
        <p className="cds-aichat-explainability-popover--content__description">
          High level 1-2 sentence description of how the AI is being used in the
          UI.
        </p>
      </header>
      <section className="cds-aichat-explainability-popover--content__section">
        <div>
          <h3>How it works</h3>
          <ol>
            <li>
              1. <strong>Key word.</strong> Description of key word.
            </li>
            <li>
              2. <strong>Key word.</strong> Description of key word.
            </li>
            <li>
              3. <strong>Key word.</strong> Description of key word.
            </li>
          </ol>
        </div>
        <div>
          <h3>Data types used</h3>
          <ul>
            <li>
              — <strong>Data type 1.</strong> Explain how it&apos;s used.
            </li>
            <li>
              — <strong>Data type 2.</strong> Explain how it&apos;s used.
            </li>
            <li>
              — <strong>Data type 3.</strong> Explain how it&apos;s used.
            </li>
          </ul>
        </div>
      </section>
      <section className="cds-aichat-explainability-popover--content__section">
        <div>
          <h3>AI model</h3>
          <Link
            href="https://example.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Launch slot="icon" size={16} /> granite.13b.v2.instruct
          </Link>
        </div>
        <div>
          <h4>Additional details</h4>
          <p>
            Additional information about data used to fine tune and/or train the
            model
          </p>
        </div>
      </section>
      <section className="cds-aichat-explainability-popover--content__section">
        <div>
          <h3>Training data set</h3>
          <Link
            href="https://example.com"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Launch slot="icon" size={16} /> IBM Security data piles
          </Link>
        </div>
      </section>
    </div>
  );
}

function ExplainabilityPopoverActions() {
  return (
    <div
      slot="explainabilityPopoverActions"
      className="cds-aichat-explainability-popover--actions"
    >
      <IconButton
        slot="actions"
        size={BUTTON_SIZE.LARGE}
        kind={BUTTON_KIND.GHOST}
      >
        <FoldersIcon slot="icon" />
        <span slot="tooltip-content">Folders</span>
      </IconButton>
      <IconButton
        slot="actions"
        size={BUTTON_SIZE.LARGE}
        kind={BUTTON_KIND.GHOST}
      >
        <OpenFolderIcon slot="icon" />
        <span slot="tooltip-content">Open Folder</span>
      </IconButton>
      <IconButton
        slot="actions"
        size={BUTTON_SIZE.LARGE}
        kind={BUTTON_KIND.GHOST}
      >
        <ViewIcon slot="icon" />
        <span slot="tooltip-content">View</span>
      </IconButton>
      <AILabelActionButton slot="actions">View details</AILabelActionButton>
    </div>
  );
}

export { ExplainabilityPopoverActions, ExplainabilityPopoverContent };
