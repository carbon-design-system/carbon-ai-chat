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
import { Launch, Folders, FolderOpen, View } from "@carbon/icons-react";
import { AILabelActions, Button, IconButton, Link, Tag } from "@carbon/react";

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
            size="sm"
            type="outline"
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
            <Launch size={16} /> granite.13b.v2.instruct
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
            <Launch size={16} /> IBM Security data piles
          </Link>
        </div>
      </section>
    </div>
  );
}

function ExplainabilityPopoverActions() {
  return (
    <AILabelActions>
      <IconButton size="lg" kind="ghost" label="Folders">
        <Folders />
      </IconButton>
      <IconButton size="lg" kind="ghost" label="Open Folder">
        <FolderOpen />
      </IconButton>
      <IconButton size="lg" kind="ghost" label="View">
        <View />
      </IconButton>
      <Button>View details</Button>
    </AILabelActions>
  );
}

export { ExplainabilityPopoverActions, ExplainabilityPopoverContent };
