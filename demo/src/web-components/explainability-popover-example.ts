/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/ai-label/index.js";
import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/tag/index.js";
import "@carbon/web-components/es/components/link/index.js";
import "@carbon/web-components/es/components/list/index.js";
import { css, html, LitElement } from "lit";
import { customElement } from "lit/decorators.js";
import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import Launch16 from "@carbon/icons/es/launch/16.js";
import Folders16 from "@carbon/icons/es/folders/16.js";
import FolderOpen16 from "@carbon/icons/es/folder--open/16.js";
import View16 from "@carbon/icons/es/view/16.js";

@customElement("explainability-popover-content")
class ExplainabilityPopoverContent extends LitElement {
  static styles = css`
    .cds-aichat-explainability-popover--content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-block-start: 0.5rem;
    }

    .cds-aichat-explainability-popover--content * {
      margin-block-start: 0;
      margin-block-end: 0;
    }

    .cds-aichat-explainability-popover--content__header {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .cds-aichat-explainability-popover--content__eyebrow-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .cds-aichat-explainability-popover--content__label {
      font-size: var(--cds-label-02-font-size);
      font-weight: var(--cds-label-02-font-weight);
      line-height: var(--cds-label-02-line-height);
      letter-spacing: var(--cds-label-02-letter-spacing);
      color: var(--cds-text-secondary);
    }

    .cds-aichat-explainability-popover--content__title {
      margin: 0;
      font-size: 1.75rem;
      font-weight: 400;
      line-height: 2.25rem;
      letter-spacing: 0;
    }

    .cds-aichat-explainability-popover--content__description {
      font-size: var(--cds-body-01-font-size);
      font-weight: var(--cds-body-01-font-weight);
      line-height: var(--cds-body-01-line-height);
      letter-spacing: var(--cds-body-01-letter-spacing);
      color: var(--cds-text-secondary);
    }

    .cds-aichat-explainability-popover--content__section {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-block-start: 1.5rem;
      border-block-start: 1px solid var(--cds-border-subtle-00);
    }

    .cds-aichat-explainability-popover--content__section:last-of-type {
      padding-block-end: 1.5rem;
    }

    .cds-aichat-explainability-popover--content__section h3,
    .cds-aichat-explainability-popover--content__section h4,
    .cds-aichat-explainability-popover--content__section h5,
    .cds-aichat-explainability-popover--content__section h6 {
      font-size: var(--cds-body-01-font-size);
      font-weight: var(--cds-body-01-font-weight);
      line-height: var(--cds-body-01-line-height);
      letter-spacing: var(--cds-body-01-letter-spacing);
      color: var(--cds-text-secondary);
    }

    .cds-aichat-explainability-popover--content__section p {
      font-size: var(--cds-body-01-font-size);
      font-weight: var(--cds-body-01-font-weight);
      line-height: var(--cds-body-01-line-height);
      letter-spacing: var(--cds-body-01-letter-spacing);
    }

    .cds-aichat-explainability-popover--content__section
      cds-ordered-list
      cds-list-item::before {
      position: static;
      margin-inline-end: 0.5rem;
      display: inline-block;
    }
  `;

  render() {
    return html`
      <div
        role="dialog"
        slot="body-text"
        class="cds-aichat-explainability-popover--content"
      >
        <header class="cds-aichat-explainability-popover--content__header">
          <div class="cds-aichat-explainability-popover--content__eyebrow-row">
            <span class="cds-aichat-explainability-popover--content__label">
              AI explained
            </span>
            <cds-tag
              class="cds-aichat--header__slug-confidence"
              size="sm"
              type="outline"
            >
              Confidence: 89%
            </cds-tag>
          </div>
          <h2 class="cds-aichat-explainability-popover--content__title">
            Name of feature
          </h2>
          <p class="cds-aichat-explainability-popover--content__description">
            High level 1-2 sentence description of how the AI is being used in
            the UI.
          </p>
        </header>
        <section class="cds-aichat-explainability-popover--content__section">
          <div>
            <h3>How it works</h3>
            <cds-ordered-list>
              <cds-list-item
                ><strong>Key word.</strong> Description of key
                word.</cds-list-item
              >
              <cds-list-item
                ><strong>Key word.</strong> Description of key
                word.</cds-list-item
              >
              <cds-list-item
                ><strong>Key word.</strong> Description of key
                word.</cds-list-item
              >
            </cds-ordered-list>
          </div>
          <div>
            <h3>Data types used</h3>
            <cds-unordered-list>
              <cds-list-item
                ><strong>Data type 1.</strong> Explain how it's
                used.</cds-list-item
              >
              <cds-list-item
                ><strong>Data type 2.</strong> Explain how it's
                used.</cds-list-item
              >
              <cds-list-item
                ><strong>Data type 3.</strong> Explain how it's
                used.</cds-list-item
              >
            </cds-unordered-list>
          </div>
        </section>
        <section class="cds-aichat-explainability-popover--content__section">
          <div>
            <h3>AI model</h3>
            <cds-link
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              granite.13b.v2.instruct${iconLoader(Launch16, { slot: "icon" })}
            </cds-link>
          </div>
          <div>
            <h4>Additional details</h4>
            <p>
              Additional information about data used to fine tune and/or train
              the model
            </p>
          </div>
        </section>
        <section class="cds-aichat-explainability-popover--content__section">
          <div>
            <h3>Training data set</h3>
            <cds-link
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              IBM Security data piles${iconLoader(Launch16, { slot: "icon" })}
            </cds-link>
          </div>
        </section>
      </div>
    `;
  }
}

@customElement("explainability-popover-actions")
class ExplainabilityPopoverActions extends LitElement {
  static styles = css`
    :host {
      display: flex;
    }
  `;

  render() {
    return html`
      <cds-icon-button slot="actions" size="lg" kind="ghost">
        ${iconLoader(Folders16, { slot: "icon" })}
        <span slot="tooltip-content">Folders</span>
      </cds-icon-button>
      <cds-icon-button slot="actions" size="lg" kind="ghost">
        ${iconLoader(FolderOpen16, { slot: "icon" })}
        <span slot="tooltip-content">Open Folder</span>
      </cds-icon-button>
      <cds-icon-button slot="actions" size="lg" kind="ghost">
        ${iconLoader(View16, { slot: "icon" })}
        <span slot="tooltip-content">View</span>
      </cds-icon-button>
      <cds-ai-label-action-button slot="actions">
        View details
      </cds-ai-label-action-button>
    `;
  }
}

export { ExplainabilityPopoverContent, ExplainabilityPopoverActions };
