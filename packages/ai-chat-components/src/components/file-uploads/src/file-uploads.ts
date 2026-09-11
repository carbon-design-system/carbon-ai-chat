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
} from 'lit';
import { property, state } from 'lit/decorators.js';

import { AriaAnnouncerManager } from '../../../globals/utils/aria-announcer-manager.js';
import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import prefix from '../../../globals/settings.js';
import type {
  FileUpload,
  FileRemoveEventDetail,
} from '../../prompt-line/src/types.js';

import './file-upload-item.js';
import styles from './file-uploads.scss?lit';

/** Minimal per-file state captured between renders to diff status transitions. */
interface UploadSnapshot {
  status: FileUpload['status'];
  isError: boolean;
  errorMessage?: string;
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

  /** Label for the remove file button, used when no file name is available. */
  @property({ type: String, attribute: 'remove-file-label' })
  removeFileLabel = 'Remove file';

  /**
   * Returns the accessible name for one file's remove button. Receives the file
   * name so the consumer can interpolate it, giving each button a distinct name.
   * The default English formatter is for standalone use; `@carbon/ai-chat`
   * supplies an `intl`-backed one. A file with no name falls back to
   * {@link removeFileLabel}.
   */
  @property({ type: Object, attribute: false })
  getRemoveFileLabel: (args: { name?: string }) => string = ({ name }) =>
    name ? `Remove ${name}` : this.removeFileLabel;

  /** Label announced and shown while a file is uploading. */
  @property({ type: String, attribute: 'uploading-file-label' })
  uploadingFileLabel = 'Uploading file';

  /** Announced when a file is removed from the upload list. */
  @property({ type: String, attribute: 'file-removed-label' })
  fileRemovedLabel = 'File removed.';

  /** Announced when a file finishes uploading successfully. */
  @property({ type: String, attribute: 'upload-success-label' })
  uploadSuccessLabel = 'The file was uploaded successfully.';

  /** Announced when a file fails to upload, ahead of the host's own reason. */
  @property({ type: String, attribute: 'upload-failure-label' })
  uploadFailureLabel = 'There was an error uploading the file.';

  /**
   * Returns the announcement made when one or more files are added in the same
   * frame. Receives the batch count so the consumer can localize and pluralize
   * (correct plural rules are locale-specific). The default English formatter is
   * for standalone use; `@carbon/ai-chat` supplies an `intl`-backed one. Files
   * added together are announced once, not once per file.
   */
  @property({ type: Object, attribute: false })
  getFilesAddedText: (args: { count: number }) => string = ({ count }) =>
    count === 1 ? 'File added.' : `${count} files added.`;

  /**
   * Returns the announcement made when one or more files begin uploading in the
   * same frame. Receives the batch count for localization/pluralization; the
   * default English formatter is for standalone use.
   */
  @property({ type: Object, attribute: false })
  getFilesUploadingText: (args: { count: number }) => string = ({ count }) =>
    count === 1 ? 'Uploading file.' : `Uploading ${count} files.`;

  /**
   * Returns the announcement made when uploads fail, receiving one reason per
   * failed file so every reason is carried without repeating a shared title. The
   * default builds on {@link uploadFailureLabel} and is for standalone use;
   * `@carbon/ai-chat` supplies one composed from its language pack. Failures
   * with no stated reason announce the label alone.
   */
  @property({ type: Object, attribute: false })
  getFileUploadFailureText: (args: { messages: string[] }) => string = ({
    messages,
  }) => [this.uploadFailureLabel, ...messages].filter(Boolean).join(' ');

  /** Whether scrolling is required to view the entire width of all file upload items. */
  @state()
  private _hasOverflow = false;

  private _announcer = new AriaAnnouncerManager();

  /** Previous-frame snapshot keyed by upload id, used to detect transitions. */
  private _snapshots = new Map<string, UploadSnapshot>();

  private _resizeObserver = new ResizeObserver(() => {
    this._checkOverflow();
  });

  private _checkOverflow() {
    const container = this.renderRoot.querySelector<HTMLElement>(
      `.${prefix}--file-uploads-container`
    );
    this._hasOverflow =
      !!container && container.scrollWidth > container.clientWidth;
  }

  protected firstUpdated() {
    const politeRegions = this.renderRoot.querySelectorAll<HTMLDivElement>(
      `.${prefix}--file-uploads-live-region[aria-live="polite"]`
    );
    const assertiveRegions = this.renderRoot.querySelectorAll<HTMLDivElement>(
      `.${prefix}--file-uploads-live-region[aria-live="assertive"]`
    );

    this._announcer.connect([...politeRegions], [...assertiveRegions]);
    // Seed from the initial uploads so the already-rendered set does not
    // produce a burst of "added" announcements on first paint. Failures are left
    // unseeded so the first diff still reports them: the element remounts when the
    // input is hidden and re-shown, and a blocking failure must not be swallowed.
    this._snapshots = this._snapshotOf(
      this.uploads.filter((upload) => !upload.isError)
    );
  }

  disconnectedCallback() {
    this._resizeObserver.disconnect();
    this._announcer.disconnect();
    super.disconnectedCallback();
  }

  protected updated(changedProperties: PropertyValues) {
    if (changedProperties.has('uploads')) {
      this.toggleAttribute('has-uploads', this.uploads.length > 0);
      this._announceTransitions();

      this._resizeObserver.disconnect();
      const container = this.renderRoot.querySelector<HTMLElement>(
        `.${prefix}--file-uploads-container`
      );
      if (container) {
        this._resizeObserver.observe(container);
        this._checkOverflow();
      } else {
        this._hasOverflow = false;
      }
    }
  }

  private _snapshotOf(uploads: FileUpload[]): Map<string, UploadSnapshot> {
    return new Map(
      uploads.map((upload) => [
        upload.id,
        {
          status: upload.status,
          isError: Boolean(upload.isError),
          errorMessage: upload.errorMessage,
        },
      ])
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
   * they are announced inline — a failure assertively, since it blocks sending.
   */
  private _announceTransitions() {
    const previous = this._snapshots;

    let addedCount = 0;
    let uploadingCount = 0;
    const failures: string[] = [];

    for (const upload of this.uploads) {
      const before = previous.get(upload.id);
      const isError = Boolean(upload.isError);

      if (!before) {
        // New item this frame.
        if (upload.status === 'uploading') {
          uploadingCount += 1;
        } else if (isError) {
          failures.push(upload.errorMessage ?? '');
        } else {
          addedCount += 1;
        }
      } else if (!before.isError && isError) {
        failures.push(upload.errorMessage ?? '');
      } else if (isError && before.errorMessage !== upload.errorMessage) {
        // The host can revise why a file failed without it ever leaving the error
        // state; nothing else would speak the new reason.
        failures.push(upload.errorMessage ?? '');
      } else if (
        before.status === 'uploading' &&
        upload.status !== 'uploading' &&
        !isError
      ) {
        this._announcer.announce(this.uploadSuccessLabel);
      } else if (
        before.status !== 'uploading' &&
        upload.status === 'uploading'
      ) {
        // A staged file that begins uploading. Files staged in the input area
        // start in the "edit" state and flip to "uploading" once their upload
        // begins, so this transition fires for staged-then-uploaded files (the
        // "added" announcement already fired when they were staged).
        uploadingCount += 1;
      }
    }

    if (failures.length > 0) {
      this._announcer.announce(
        this.getFileUploadFailureText({
          messages: failures.filter(Boolean),
        }),
        'assertive'
      );
    }
    if (addedCount > 0) {
      this._announcer.announce(this.getFilesAddedText({ count: addedCount }));
    }
    if (uploadingCount > 0) {
      this._announcer.announce(
        this.getFilesUploadingText({ count: uploadingCount })
      );
    }

    this._snapshots = this._snapshotOf(this.uploads);
  }

  private _handleFileRemove(_e: CustomEvent<FileRemoveEventDetail>) {
    // Announce here rather than in the diff so we only speak on a user-initiated
    // removal, not when uploads clear on send.
    this._announcer.announce(this.fileRemovedLabel);
    // Event was dispatched composed+bubbling from file-upload-item — it will
    // continue to bubble to the consumer. No need to re-dispatch.
  }

  render() {
    return html`
      <div class="${prefix}--file-uploads-live-region" aria-live="polite"></div>
      <div class="${prefix}--file-uploads-live-region" aria-live="polite"></div>
      <div
        class="${prefix}--file-uploads-live-region"
        aria-live="assertive"></div>
      <div
        class="${prefix}--file-uploads-live-region"
        aria-live="assertive"></div>
      ${
        this.uploads && this.uploads.length > 0
          ? html`
              <div
                class="${prefix}--file-uploads-gradient-wrapper${this._hasOverflow ? ` ${prefix}--file-uploads-gradient-wrapper--overflow` : ''}">
                <div class="${prefix}--file-uploads-container">
                  ${this.uploads.map(
                    (upload) => html`
                      <cds-aichat-file-upload-item
                        .upload="${upload}"
                        remove-file-label="${this.removeFileLabel}"
                        remove-file-named-label="${this.getRemoveFileLabel({
                          name: upload.file?.name,
                        })}"
                        uploading-file-label="${this.uploadingFileLabel}"
                        @cds-aichat-file-remove="${this._handleFileRemove}"></cds-aichat-file-upload-item>
                    `
                  )}
                </div>
              </div>
            `
          : nothing
      }
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-file-uploads': FileUploadsElement;
  }
}

export default FileUploadsElement;
