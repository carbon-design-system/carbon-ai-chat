/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { css, html, LitElement, nothing, unsafeCSS } from "lit";
import { property } from "lit/decorators.js";

import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import { isBrowser } from "../../../globals/utils/browser-utils.js";
import prefix from "../../../globals/settings.js";

import "@carbon/web-components/es/components/file-uploader/index.js";

import { iconLoader } from "@carbon/web-components/es/globals/internal/icon-loader.js";
import DocumentPDF20 from "@carbon/icons/es/PDF/20.js";
import DocumentTXT20 from "@carbon/icons/es/TXT/20.js";
import DocumentXLS20 from "@carbon/icons/es/XLS/20.js";
import DocumentZIP20 from "@carbon/icons/es/ZIP/20.js";
import DocumentPPT20 from "@carbon/icons/es/PPT/20.js";
import DocumentCSV20 from "@carbon/icons/es/CSV/20.js";
import DocumentDOC20 from "@carbon/icons/es/DOC/20.js";
import DocumentHTML20 from "@carbon/icons/es/HTML/20.js";
import DocumentJSON20 from "@carbon/icons/es/JSON/20.js";
import PlayFilledAlt16 from "@carbon/icons/es/play--filled--alt/16.js";

import type {
  FileUpload,
  FileRemoveEventDetail,
} from "../../prompt-line/src/types.js";

import styles from "./file-upload-item.scss?lit";

/**
 * Renders a single file upload chip with an optional media preview or file-type icon.
 *
 * @element cds-aichat-file-upload-item
 * @fires {CustomEvent<FileRemoveEventDetail>} cds-aichat-file-remove - Fired when the remove button is clicked
 */
@carbonElement(`${prefix}-file-upload-item`)
class FileUploadItemElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /** The file upload data to render. */
  @property({ type: Object, attribute: false })
  upload: FileUpload | null = null;

  /** Label for the remove file button. */
  @property({ type: String, attribute: "remove-file-label" })
  removeFileLabel = "Remove file";

  /** Label for the uploading status. */
  @property({ type: String, attribute: "uploading-file-label" })
  uploadingFileLabel = "Uploading";

  /** Object URL created for image/video previews. Revoked on disconnect or when the file changes. */
  private _objectURL: string | null = null;

  /** The File instance the current object URL was created for. */
  private _objectURLFile: File | null = null;

  private _getOrCreateObjectURL(): string | null {
    if (this.upload && this._objectURLFile !== this.upload.file) {
      if (this._objectURL) {
        URL.revokeObjectURL(this._objectURL);
      }
      this._objectURL = URL.createObjectURL(this.upload.file);
      this._objectURLFile = this.upload.file;
    }
    return this._objectURL;
  }

  private _hasMediaPreview(): boolean {
    if (!this.upload) {
      return false;
    }
    const { type } = this.upload.file;
    return type.startsWith("image/") || type.startsWith("video/");
  }

  firstUpdated() {
    if (!this._hasMediaPreview()) {
      return;
    }
    const uploaderItem = this.shadowRoot?.querySelector(
      "cds-file-uploader-item",
    );
    const innerRoot = uploaderItem?.shadowRoot;
    if (!innerRoot) {
      return;
    }
    // apply style that reduces margin when there is a media preview being rendered in the chip
    const style = document.createElement("style");
    style.textContent =
      ".cds--file-filename { margin-inline-start: 2px !important; }";
    innerRoot.appendChild(style);
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._objectURL) {
      URL.revokeObjectURL(this._objectURL);
      this._objectURL = null;
      this._objectURLFile = null;
    }
  }

  private _renderPreview() {
    if (!this.upload) {
      return nothing;
    }

    const { type, name } = this.upload.file;

    // Image preview
    if (type.startsWith("image/")) {
      const url = this._getOrCreateObjectURL();
      if (!url) {
        return nothing;
      }

      return html`<span class="${prefix}-file-upload-item__preview-wrapper"
        ><img
          class="${prefix}-file-upload-item__preview"
          src="${url}"
          width="36"
          height="36"
          alt=""
          aria-hidden="true"
      /></span>`;
    }

    // Video preview
    if (type.startsWith("video/")) {
      const url = this._getOrCreateObjectURL();
      if (!url) {
        return nothing;
      }

      const openVideo = () => {
        const newWindow = isBrowser()
          ? window.open("", "_blank", "width=800,height=600")
          : null;

        if (!newWindow) {
          return;
        }

        const style = newWindow.document.createElement("style");
        style.textContent =
          "* { margin: 0; padding: 0; background: #000 } video { display: block; width: 100%; height: 100vh; object-fit: contain }";
        const video = newWindow.document.createElement("video");
        video.src = url;
        video.controls = true;
        video.autoplay = true;
        newWindow.document.title = name;
        newWindow.document.head.appendChild(style);
        newWindow.document.body.appendChild(video);
      };

      return html`<button
        class="${prefix}-file-upload-item__preview-wrapper ${prefix}-file-upload-item__video-preview-wrapper"
        type="button"
        aria-label="Play video"
        @click="${openVideo}"
      >
        <video
          class="${prefix}-file-upload-item__preview"
          src="${url}"
          width="36"
          height="36"
          preload="metadata"
          muted
          playsinline
          tabindex="-1"
          aria-hidden="true"
          @loadedmetadata="${(e: Event) => {
            (e.target as HTMLVideoElement).currentTime = 0.1;
          }}"
        ></video
        ><span class="${prefix}-file-upload-item__play-badge" aria-hidden="true"
          >${iconLoader(PlayFilledAlt16)}</span
        >
      </button>`;
    }

    // File type icon (for supported icons)
    const extension = name.split(".").pop()?.toLowerCase() ?? "";
    const mime = type.toLowerCase();

    type IconEntry = [boolean, typeof DocumentPDF20];
    const iconMap: IconEntry[] = [
      [mime === "application/pdf" || extension === "pdf", DocumentPDF20],
      [mime === "text/plain" || extension === "txt", DocumentTXT20],
      [
        mime === "application/vnd.ms-excel" ||
          mime ===
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
          extension === "xls" ||
          extension === "xlsx",
        DocumentXLS20,
      ],
      [
        mime === "application/zip" ||
          mime === "application/x-zip-compressed" ||
          extension === "zip",
        DocumentZIP20,
      ],
      [
        mime === "application/vnd.ms-powerpoint" ||
          mime ===
            "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
          extension === "ppt" ||
          extension === "pptx",
        DocumentPPT20,
      ],
      [mime === "text/csv" || extension === "csv", DocumentCSV20],
      [
        mime === "application/msword" ||
          mime ===
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
          extension === "doc" ||
          extension === "docx",
        DocumentDOC20,
      ],
      [
        mime === "text/html" || extension === "html" || extension === "htm",
        DocumentHTML20,
      ],
      [mime === "application/json" || extension === "json", DocumentJSON20],
    ];

    const match = iconMap.find((entry) => entry[0] === true);
    if (match) {
      return html`<span
        class="${prefix}-file-upload-item__icon"
        aria-hidden="true"
        >${iconLoader(match[1])}</span
      >`;
    }

    return nothing;
  }

  private _handleRemove() {
    if (!this.upload) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<FileRemoveEventDetail>("cds-aichat-file-remove", {
        detail: { fileId: this.upload.id },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    if (!this.upload) {
      return nothing;
    }

    return html`
      <cds-file-uploader-item
        size="md"
        .state="${this.upload.status}"
        .iconDescription="${
          this.upload.status === "uploading"
            ? this.uploadingFileLabel
            : this.removeFileLabel
        }"
        .errorSubject="${this.upload.errorMessage || ""}"
        ?invalid="${this.upload.isError}"
        @cds-file-uploader-item-deleted="${this._handleRemove}"
      >
        ${this._renderPreview()} ${this.upload.file.name}
      </cds-file-uploader-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-file-upload-item": FileUploadItemElement;
  }
}

export default FileUploadItemElement;
