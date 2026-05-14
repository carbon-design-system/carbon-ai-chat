/*
 *  Copyright IBM Corp. 2026, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import "@carbon/web-components/es/components/button/index.js";
import "@carbon/web-components/es/components/tag/index.js";
import "@carbon/web-components/es/components/link/index.js";
import "@carbon/ai-chat-components/es/components/markdown/index.js";
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
    /* Explainability popover content styles */
    .cds-aichat-explainability-popover--content {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
      padding-block-start: 0.5rem;
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
      font-size: var(--cds-label-02-font-size, 0.875rem);
      font-weight: var(--cds-label-02-font-weight, 400);
      line-height: var(--cds-label-02-line-height, 1.28572);
      letter-spacing: var(--cds-label-02-letter-spacing, 0.16px);
      color: var(--cds-text-secondary, #525252);
    }

    .cds-aichat-explainability-popover--content__title {
      font-size: var(--cds-heading-04-font-size, 1.75rem);
      font-weight: var(--cds-heading-04-font-weight, 400);
      line-height: var(--cds-heading-04-line-height, 1.28572);
      letter-spacing: var(--cds-heading-04-letter-spacing, 0);
    }

    .cds-aichat-explainability-popover--content__description {
      font-size: var(--cds-body-01-font-size, 0.875rem);
      font-weight: var(--cds-body-01-font-weight, 400);
      line-height: var(--cds-body-01-line-height, 1.42857);
      letter-spacing: var(--cds-body-01-letter-spacing, 0.16px);
    }

    .cds-aichat-explainability-popover--content__section {
      display: flex;
      flex-direction: column;
      border-block-start: 1px solid var(--cds-border-subtle-00, #e0e0e0);
      gap: 1.5rem;
      padding-block-start: 1.5rem;
    }

    .cds-aichat-explainability-popover--content__section h3,
    .cds-aichat-explainability-popover--content__section h4,
    .cds-aichat-explainability-popover--content__section h5,
    .cds-aichat-explainability-popover--content__section h6 {
      font-size: var(--cds-body-01-font-size, 0.875rem);
      font-weight: var(--cds-body-01-font-weight, 400);
      line-height: var(--cds-body-01-line-height, 1.42857);
      letter-spacing: var(--cds-body-01-letter-spacing, 0.16px);
      color: var(--cds-text-secondary, #525252);
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
            <cds-aichat-markdown
              markdown="1. **Key word.** Description of key word.\n2. **Key word.** Description of key word.\n3. **Key word.** Description of key word."
            ></cds-aichat-markdown>
          </div>
          <div>
            <h3>Data types used</h3>
            <cds-aichat-markdown
              markdown="- **Data type 1.** Explain how it's used.\n- **Data type 2.** Explain how it's used.\n- **Data type 3.** Explain how it's used."
            ></cds-aichat-markdown>
          </div>
        </section>
        <section
          class="cds-aichat-explainability-popover--content__section"
          aria-labelledby="explainability-ai-model"
        >
          <div>
            <h3>AI model</h3>
            <cds-link
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span slot="icon">${iconLoader(Launch16)}</span>
              granite.13b.v2.instruct
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
        <section
          class="cds-aichat-explainability-popover--content__section"
          aria-labelledby="explainability-training-data"
        >
          <div>
            <h3>Training data set</h3>
            <cds-link
              href="https://example.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              <span slot="icon">${iconLoader(Launch16)}</span>
              IBM Security data piles
            </cds-link>
          </div>
        </section>
      </div>
    `;
  }
}

@customElement("explainability-popover-actions")
class ExplainabilityPopoverActions extends LitElement {
  render() {
    return html`
      <cds-icon-button
        slot="actions"
        size="lg"
        kind="ghost"
      >
        <span slot="icon">${iconLoader(Folders16)}</span>
        <span slot="tooltip-content">Folders</span>
      </cds-icon-button>
      <cds-icon-button
        slot="actions"
        size="lg"
        kind="ghost"
      >
        <span slot="icon">${iconLoader(FolderOpen16)}</span>
        <span slot="tooltip-content">Open Folder</span>
      </cds-icon-button>
      <cds-icon-button
        slot="actions"
        size="lg"
        kind="ghost"
      >
        <span slot="icon">${iconLoader(View16)}</span>
        <span slot="tooltip-content">View</span>
      </cds-icon-button>
      <cds-ai-label-action-button slot="actions">
        View details
      </cds-ai-label-action-button>
    `;
  }
}

export { ExplainabilityPopoverContent, ExplainabilityPopoverActions };
