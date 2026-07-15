/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  css,
  html,
  LitElement,
  nothing,
  type PropertyValues,
  unsafeCSS,
} from "lit";
import { property } from "lit/decorators.js";

import { AriaAnnouncerManager } from "../../../globals/utils/aria-announcer-manager.js";
import { carbonElement } from "../../../globals/decorators/carbon-element.js";
import prefix from "../../../globals/settings.js";

import "@carbon/web-components/es/components/file-uploader/index.js";

import type {
  FileUpload,
  FileRemoveEventDetail,
} from "../../input/src/types.js";

import styles from "./file-uploads.scss?lit";

/** Minimal per-file state captured between renders to diff status transitions. */
interface UploadSnapshot {
  status: FileUpload["status"];
  isError: boolean;
}

/**
 * Displays a list of file uploads with status indicators, and announces upload
 * state changes (added / uploading / success / failure / removed) to screen
 * readers via the shared {@link AriaAnnouncerManager}.
 *
 * The element stays mounted whenever uploading is available (even with no
 * pending files) so its live regions survive removal of the last file; the host
 * reflects a `has-uploads` attribute so the surrounding layout can collapse its
 * spacing when empty.
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

  /** Label announced and shown while a file is uploading. */
  @property({ type: String, attribute: "uploading-file-label" })
  uploadingFileLabel = "Uploading file";

  /** Announced when a file is removed from the upload list. */
  @property({ type: String, attribute: "file-removed-label" })
  fileRemovedLabel = "File removed.";

  /** Announced when a file finishes uploading successfully. */
  @property({ type: String, attribute: "upload-success-label" })
  uploadSuccessLabel = "The file was uploaded successfully.";

  /** Announced when a file fails to upload. */
  @property({ type: String, attribute: "upload-failure-label" })
  uploadFailureLabel = "There was an error uploading the file.";

  /**
   * Returns the announcement made when one or more files are added in the same
   * frame. Receives the batch count so the consumer can localize and pluralize
   * (correct plural rules are locale-specific). The default English formatter is
   * for standalone use; `@carbon/ai-chat` supplies an `intl`-backed one. Files
   * added together are announced once, not once per file.
   */
  @property({ type: Object, attribute: false })
  getFilesAddedText: (args: { count: number }) => string = ({ count }) =>
    count === 1 ? "File added." : `${count} files added.`;

  /**
   * Returns the announcement made when one or more files begin uploading in the
   * same frame. Receives the batch count for localization/pluralization; the
   * default English formatter is for standalone use.
   */
  @property({ type: Object, attribute: false })
  getFilesUploadingText: (args: { count: number }) => string = ({ count }) =>
    count === 1 ? "Uploading file." : `Uploading ${count} files.`;

  private _announcer = new AriaAnnouncerManager();

  /** Previous-frame snapshot keyed by upload id, used to detect transitions. */
  private _snapshots = new Map<string, UploadSnapshot>();

  protected firstUpdated() {
    const regions = this.renderRoot.querySelectorAll<HTMLDivElement>(
      `.${prefix}--file-uploads-live-region`,
    );
    this._announcer.connect(Array.from(regions));
    // Seed from the initial uploads so the already-rendered set does not
    // produce a burst of "added" announcements on first paint.
    this._snapshots = this._snapshotOf(this.uploads);
  }

  disconnectedCallback() {
    this._announcer.disconnect();
    super.disconnectedCallback();
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has("uploads")) {
      this.toggleAttribute("has-uploads", this.uploads.length > 0);
      this._announceTransitions();
    }
  }

  private _snapshotOf(uploads: FileUpload[]): Map<string, UploadSnapshot> {
    return new Map(
      uploads.map((upload) => [
        upload.id,
        { status: upload.status, isError: Boolean(upload.isError) },
      ]),
    );
  }

  /**
   * Announce per-file status transitions by diffing the current uploads against
   * the previous frame. The input list never carries a positive "complete"
   * status (a finished assistant upload settles back to "edit"), so success is
   * inferred from the `uploading → not-uploading` transition. Removals are
   * announced from {@link _handleFileRemove} instead — diffing would also fire
   * when uploads clear on send.
   *
   * Added and uploading transitions are coalesced: when several files are added
   * or start uploading in the same frame, a single counted announcement is made
   * (via {@link getFilesAddedText} / {@link getFilesUploadingText}) rather than
   * one per file. Success and failure settle per file in their own frames, so
   * they are announced inline.
   */
  private _announceTransitions() {
    const previous = this._snapshots;

    let addedCount = 0;
    let uploadingCount = 0;

    for (const upload of this.uploads) {
      const before = previous.get(upload.id);
      const isError = Boolean(upload.isError);

      if (!before) {
        // New item this frame.
        if (upload.status === "uploading") {
          uploadingCount += 1;
        } else if (isError) {
          this._announcer.announce(this.uploadFailureLabel);
        } else {
          addedCount += 1;
        }
      } else if (!before.isError && isError) {
        this._announcer.announce(this.uploadFailureLabel);
      } else if (
        before.status === "uploading" &&
        upload.status !== "uploading" &&
        !isError
      ) {
        this._announcer.announce(this.uploadSuccessLabel);
      } else if (
        before.status !== "uploading" &&
        upload.status === "uploading"
      ) {
        // A staged file that begins uploading. Files staged in the input area
        // start in the "edit" state and flip to "uploading" once their upload
        // begins, so this transition fires for staged-then-uploaded files (the
        // "added" announcement already fired when they were staged).
        uploadingCount += 1;
      }
    }

    if (addedCount > 0) {
      this._announcer.announce(this.getFilesAddedText({ count: addedCount }));
    }
    if (uploadingCount > 0) {
      this._announcer.announce(
        this.getFilesUploadingText({ count: uploadingCount }),
      );
    }

    this._snapshots = this._snapshotOf(this.uploads);
  }

  private _handleFileRemove(fileId: string) {
    // Announce here rather than in the diff so we only speak on a user-initiated
    // removal, not when uploads clear on send.
    this._announcer.announce(this.fileRemovedLabel);
    this.dispatchEvent(
      new CustomEvent<FileRemoveEventDetail>("cds-aichat-file-remove", {
        detail: { fileId },
        bubbles: true,
        composed: true,
      }),
    );
  }

  render() {
    return html`
      <div class="${prefix}--file-uploads-live-region" aria-live="polite"></div>
      <div class="${prefix}--file-uploads-live-region" aria-live="polite"></div>
      ${this.uploads && this.uploads.length > 0
        ? html`
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
          `
        : nothing}
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    "cds-aichat-file-uploads": FileUploadsElement;
  }
}

export default FileUploadsElement;
