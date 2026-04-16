/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import "@carbon/web-components/es/components/file-uploader/index.js";

import type {
  FileUpload,
  FileRemoveEventDetail,
} from "../../input/src/types.js";

import styles from "./file-uploads.scss?lit";

/**
 * Displays a list of file uploads with status indicators.
 *
 * @element cds-aichat-file-uploads
 * @fires {CustomEvent<FileRemoveEventDetail>} cds-aichat-file-remove - Fired when a file is removed
 */
@carbonElement(`${prefix}-file-uploads`)
class FileUploadsElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /** Array of file uploads to display. */
  @property({ type: Array, attribute: false })
  uploads: FileUpload[] = [];

  /** Label for the remove file button. */
  @property({ type: String, attribute: "remove-file-label" })
  removeFileLabel = "Remove file";

  /** Label for the uploading status. */
  @property({ type: String, attribute: "uploading-file-label" })
  uploadingFileLabel = "Uploading";

  private _handleFileRemove(fileId: string) {
    this.dispatchEvent(
      new CustomEvent<FileRemoveEventDetail>("cds-aichat-file-remove", {
        detail: { fileId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.uploads || this.uploads.length === 0) {
      return nothing;
    }

    return html`
      <div class="${prefix}--file-uploads-container">
        ${this.uploads.map(
          (upload) => html`
            <cds-file-uploader-item
              size="sm"
              .state="${upload.status}"
              .iconDescription="${upload.status === "uploading"
                ? this.uploadingFileLabel
                : this.removeFileLabel}"
              .errorSubject="${upload.errorMessage || ""}"
              ?invalid="${upload.isError}"
              @cds-file-uploader-item-deleted="${() =>
                this._handleFileRemove(upload.id)}"
            >
              ${upload.file.name}
            </cds-file-uploader-item>
          `,
        )}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-file-uploads": FileUploadsElement;
  }
}

export default FileUploadsElement;
