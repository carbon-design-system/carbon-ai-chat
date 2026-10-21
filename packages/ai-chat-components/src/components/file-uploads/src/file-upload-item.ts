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

import { carbonElement } from '../../../globals/decorators/carbon-element.js';
import { isBrowser } from '../../../globals/utils/browser-utils.js';
import prefix from '../../../globals/settings.js';

import '@carbon/web-components/es/components/file-uploader/index.js';

import { iconLoader } from '@carbon/web-components/es/globals/internal/icon-loader.js';
import { carbonIconToSVG } from '@carbon/web-components/es/globals/internal/icon-loader-utils.js';
import PlayFilledAlt16 from '@carbon/icons/es/play--filled--alt/16.js';
import ErrorFilled16 from '@carbon/icons/es/error--filled/16.js';
import { pickFileTypeIcon } from './file-type-icon.js';

import type {
  FileUpload,
  FileRemoveEventDetail,
} from '../../prompt-line/src/types.js';
import type { FileAttachment } from './types.js';

import styles from './file-upload-item.scss?lit';

interface SyncAttributeOptions {
  /** The element to set the attribute on. */
  element: Element;

  /** The qualified attribute name. */
  attribute: string;

  /** The value to set, or nothing to remove the attribute. */
  value?: string;
}

/** Sets `attribute` to `value`, or removes it when there is no value. */
function syncAttribute({ element, attribute, value }: SyncAttributeOptions) {
  if (value) {
    element.setAttribute(attribute, value);
  } else {
    element.removeAttribute(attribute);
  }
}

/**
 * The name, type, and (when available) `File` behind the chip, resolved from
 * whichever input was supplied.
 */
interface ResolvedFile {
  name?: string;
  mimeType?: string;
  file?: File;
  url?: string;
}

/**
 * Renders a single file chip with an optional media preview or file-type icon.
 *
 * Serves both places a file appears. In the input area it is driven by `upload`,
 * which carries the live `File`, and shows upload status plus a remove button. In a
 * sent message it is driven by either input with `read-only` set: no status, no
 * remove affordance. `attachment` exists for the read-only case where there is no
 * `File` at all — a message restored from conversation history — since a `File`
 * cannot be serialized.
 *
 * @element cds-aichat-file-upload-item
 * @fires {CustomEvent<FileRemoveEventDetail>} cds-aichat-file-remove - Fired when the remove button is clicked
 */
@carbonElement(`${prefix}-file-upload-item`)
class FileUploadItemElement extends LitElement {
  static styles = css`
    ${unsafeCSS(styles)}
  `;

  /**
   * The file to render. A {@link FileUpload} when the live `File` is to hand, as in
   * the input area; a {@link FileAttachment} when only metadata survives, as on a
   * message restored from conversation history.
   */
  @property({ type: Object, attribute: false })
  upload: FileUpload | FileAttachment | null = null;

  /**
   * Renders the chip without status or a remove button, for a file on a message
   * that has already been sent.
   */
  @property({ type: Boolean, attribute: 'read-only', reflect: true })
  readOnly = false;

  /** Label for the remove file button, used when no file name is available. */
  @property({ type: String, attribute: 'remove-file-label' })
  removeFileLabel = 'Remove file';

  /**
   * Accessible name for the remove button, with the file name already
   * interpolated by the caller. Falls back to {@link removeFileLabel}.
   */
  @property({ type: String, attribute: 'remove-file-named-label' })
  removeFileNamedLabel?: string;

  /** Label for the uploading status. */
  @property({ type: String, attribute: 'uploading-file-label' })
  uploadingFileLabel = 'Uploading';

  /**
   * Full failure text for a failed upload, announced after the file name when the
   * chip takes focus. Falls back to the upload's own error message.
   */
  @property({ type: String, attribute: 'error-description' })
  errorDescription?: string;

  /** Text shown when the file's name is not known. */
  @property({ type: String, attribute: 'fallback-label' })
  fallbackLabel = 'Attachment';

  /**
   * A preview URL that failed to load, so the chip can fall back to a file-type
   * icon. Holds the URL rather than a flag, so a new one is tried afresh: a stated
   * URL can go dead between the send and the render — a signed link expires, or an
   * object URL outlives the page that minted it.
   */
  @state()
  private _failedPreviewURL: string | null = null;

  /** Object URL created for image/video previews. Revoked on disconnect or when the file changes. */
  private _objectURL: string | null = null;

  /** The File instance the current object URL was created for. */
  private _objectURLFile: File | null = null;

  /**
   * The chip's content, resolved from whichever shape `upload` holds. Stated name
   * and type win where they exist; a `File` supplies them otherwise. Both shapes may
   * carry a `File`, so this branches on the `File` rather than on the shape.
   */
  private get _resolved(): ResolvedFile | null {
    const value = this.upload;
    if (!value) {
      return null;
    }

    const attachment = value as FileAttachment;
    const file =
      (value as FileUpload).file instanceof File
        ? (value as FileUpload).file
        : undefined;

    if (file) {
      return {
        name: attachment.name ?? file.name,
        mimeType: attachment.mimeType ?? file.type,
        file,
      };
    }

    return {
      name: attachment.name,
      mimeType: attachment.mimeType,
      url: attachment.url,
    };
  }

  /**
   * Whether `upload` is a staged upload rather than a sent attachment. Keyed on
   * `status`, which only an upload has — an attachment may carry a `File` too, so
   * the `File` no longer tells the two apart.
   */
  private _isUpload(value: FileUpload | FileAttachment): value is FileUpload {
    return typeof (value as FileUpload).status === 'string';
  }

  /** Upload status, which only a staged file has. */
  private get _uploadStatus(): string {
    return this.upload && this._isUpload(this.upload) ? this.upload.status : '';
  }

  /** Error state, which only a staged file has. */
  private get _uploadError(): { isError: boolean; message: string } {
    if (!this.upload || !this._isUpload(this.upload)) {
      return { isError: false, message: '' };
    }
    return {
      isError: Boolean(this.upload.isError),
      message: this.upload.errorMessage || '',
    };
  }

  private _getOrCreateObjectURL(file: File): string | null {
    if (this._objectURLFile !== file) {
      if (this._objectURL) {
        URL.revokeObjectURL(this._objectURL);
      }
      this._objectURL = URL.createObjectURL(file);
      this._objectURLFile = file;
    }
    return this._objectURL;
  }

  private _hasMediaPreview(): boolean {
    const resolved = this._resolved;
    if (!resolved) {
      return false;
    }

    const type = resolved.mimeType ?? '';
    if (resolved.file) {
      return type.startsWith('image/') || type.startsWith('video/');
    }

    // With no `File` to build an object URL from, only a stated URL can stand in,
    // and only for an image that loads. Everything else falls back to a file-type
    // icon.
    return this._canPreviewURL(resolved.url) && type.startsWith('image/');
  }

  /** Whether a stated URL is usable as a preview source. */
  private _canPreviewURL(url: string | undefined): url is string {
    return Boolean(url) && url !== this._failedPreviewURL;
  }

  /**
   * Only the state the patched rules read can change what they say. The
   * `_injectedStyle` check keeps the first cycle covered — and retries on the next
   * one if Carbon's shadow root wasn't there to patch yet.
   */
  updated(changedProperties: PropertyValues) {
    if (
      !this._injectedStyle ||
      changedProperties.has('readOnly') ||
      changedProperties.has('upload') ||
      changedProperties.has('_failedPreviewURL')
    ) {
      this._syncInjectedStyles();
    }

    if (
      changedProperties.has('readOnly') ||
      changedProperties.has('upload') ||
      changedProperties.has('errorDescription') ||
      !this._syncedErrorState
    ) {
      this._syncErrorState();
    }
  }

  private _syncedErrorState = false;

  /**
   * Carbon hides the invalid icon and leaves its failure message unreferenced, so
   * the chip states the failure itself, in its name, for a screen reader to read
   * when the chip takes focus.
   */
  private async _syncErrorState(): Promise<void> {
    const { isError, message } = this._uploadError;
    const invalid = !this.readOnly && isError;

    // `aria-invalid` on a role-less host is dropped, so an input-area chip states
    // a role and names itself. A read-only chip is already a list item in the
    // message list.
    const name = this.readOnly ? undefined : this._resolved?.name;
    // The failure text is folded into the name because an id reference from the
    // host cannot reach into this shadow root, and a group's contents are not read
    // when it takes focus. Focusing the chip then announces the whole failure.
    const failure = this.errorDescription || message;
    const hasFailureToAnnounce = Boolean(invalid && failure && name);
    const label = hasFailureToAnnounce ? `${name}. ${failure}` : name;
    syncAttribute({
      element: this,
      attribute: 'role',
      value: this.readOnly ? undefined : 'group',
    });
    syncAttribute({ element: this, attribute: 'aria-label', value: label });
    // Focusable so keyboard and screen reader users can land on the chip itself,
    // and hear its state.
    syncAttribute({
      element: this,
      attribute: 'tabindex',
      value: this.readOnly ? undefined : '0',
    });
    syncAttribute({
      element: this,
      attribute: 'aria-invalid',
      value: invalid ? 'true' : undefined,
    });

    const inner = this.shadowRoot?.querySelector(
      'cds-file-uploader-item'
    ) as LitElement | null;
    if (!inner) {
      return;
    }

    // Carbon draws the invalid icon in its own update, after ours; a failed upload
    // usually also moves `state` from "uploading" to "edit", which swaps the whole
    // status area. Wait for that render before looking for the icon.
    await inner.updateComplete;

    const innerRoot = inner.shadowRoot;
    if (!innerRoot) {
      return;
    }
    this._syncedErrorState = true;

    // Carbon hardcodes its WarningFilled icon for the invalid state. Swap in
    // ErrorFilled; the marker keeps repeat syncs from replacing it again.
    const warningIcon = innerRoot.querySelector(
      '.cds--file__state-container .cds--file-invalid:not([data-error-icon])'
    );
    if (invalid && warningIcon) {
      const template = document.createElement('template');
      template.innerHTML = carbonIconToSVG(ErrorFilled16, {
        class: 'cds--file-invalid',
        'aria-hidden': 'true',
        'data-error-icon': '',
      });
      warningIcon.replaceWith(template.content);
    }
  }

  /**
   * Overrides Carbon's `cds-file-uploader-item` styles from inside its shadow
   * root, since it exposes no `part=` for the affected elements.
   *
   * Carbon's adopted stylesheet wins over a `<style>` at equal specificity, so
   * some selectors repeat the `size` attribute (always set) to out-rank it.
   */
  private _syncInjectedStyles() {
    const innerRoot = this.shadowRoot?.querySelector(
      'cds-file-uploader-item'
    )?.shadowRoot;
    if (!innerRoot) {
      return;
    }

    const rules: string[] = [];
    if (this._hasMediaPreview()) {
      rules.push(
        ':host(cds-file-uploader-item) p.cds--file-filename { margin-inline-start: 2px; }'
      );
    }
    if (this.readOnly) {
      rules.push(':host .cds--file__state-container { display: none; }');
      // Carbon hangs the chip's trailing padding off the status container, so
      // hiding it leaves the name flush to the edge against a 1rem leading margin.
      // Restate it on the name to even the two sides up.
      rules.push('.cds--file-filename { margin-inline-end: 1rem; }');
    }
    if (!this.readOnly) {
      // Column gap between the name and the status area.
      rules.push(
        ':host(cds-file-uploader-item[size][size=md]) { gap: 0 var(--cds-spacing-05, 1rem); }'
      );
      // Column gap between the status area's children (error icon, remove button).
      rules.push(
        ':host([size]) .cds--file__state-container { gap: var(--cds-spacing-02, 0.25rem); }'
      );
    }
    if (!this.readOnly && this._uploadError.isError) {
      // Override core component's invalid-state styles: remove its padding and outline, hide
      // inline error text, and redraw the outline so it paints above the content.
      rules.push(':host([invalid][size]) { padding: 0; outline: none; }');
      rules.push(
        ':host([invalid][size]) .cds--form-requirement { display: none; }'
      );
      rules.push(
        ':host([invalid][size])::after { content: ""; position: absolute; inset: 0; border-radius: 0.5rem; outline: 2px solid var(--cds-support-error, #da1e28); outline-offset: -2px; pointer-events: none; }'
      );
      rules.push(
        '@media screen and (prefers-contrast) { :host([invalid][size])::after { outline-style: dotted; } }'
      );
    }

    const nextText = rules.join('\n');
    if (this._injectedStyle?.textContent === nextText) {
      return;
    }

    if (!this._injectedStyle) {
      this._injectedStyle = document.createElement('style');
      innerRoot.appendChild(this._injectedStyle);
    }
    this._injectedStyle.textContent = nextText;
  }

  /** The `<style>` patched into Carbon's shadow root. See `_syncInjectedStyles`. */
  private _injectedStyle: HTMLStyleElement | null = null;

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._objectURL) {
      URL.revokeObjectURL(this._objectURL);
      this._objectURL = null;
      this._objectURLFile = null;
    }
  }

  private _renderPreview() {
    const resolved = this._resolved;
    if (!resolved) {
      return nothing;
    }

    const { file, name, url } = resolved;
    const type = resolved.mimeType ?? '';

    // Image preview from the live File. An attachment without one falls through to
    // the URL branch below, and failing that to a file-type icon.
    if (file && type.startsWith('image/')) {
      const objectURL = this._getOrCreateObjectURL(file);
      if (!objectURL) {
        return nothing;
      }

      return html`<a
        class="${prefix}-file-upload-item__preview-wrapper"
        href="${objectURL}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open image">
        <img
          class="${prefix}-file-upload-item__preview"
          src="${objectURL}"
          width="36"
          height="36"
          alt=""
          aria-hidden="true" />
      </a>`;
    }

    // Video preview
    if (file && type.startsWith('video/')) {
      const objectURL = this._getOrCreateObjectURL(file);
      if (!objectURL) {
        return nothing;
      }

      const openVideo = () => {
        const newWindow = isBrowser()
          ? window.open('', '_blank', 'width=800,height=600')
          : null;

        if (!newWindow) {
          return;
        }

        const style = newWindow.document.createElement('style');
        style.textContent =
          '* { margin: 0; padding: 0; background: #000 } video { display: block; width: 100%; height: 100vh; object-fit: contain }';
        const video = newWindow.document.createElement('video');
        video.src = objectURL;
        video.controls = true;
        video.autoplay = true;
        newWindow.document.title = name ?? '';
        newWindow.document.head.appendChild(style);
        newWindow.document.body.appendChild(video);
      };

      return html`<button
        class="${prefix}-file-upload-item__preview-wrapper"
        type="button"
        aria-label="Play video"
        @click="${openVideo}">
        <video
          class="${prefix}-file-upload-item__preview"
          src="${objectURL}"
          width="36"
          height="36"
          preload="metadata"
          muted
          playsinline
          tabindex="-1"
          aria-hidden="true"
          @loadedmetadata="${(e: Event) => {
            (e.target as HTMLVideoElement).currentTime = 0.1;
          }}"></video
        ><span class="${prefix}-file-upload-item__play-badge" aria-hidden="true"
          >${iconLoader(PlayFilledAlt16)}</span
        >
      </button>`;
    }

    // Image preview from a stated URL — an attachment whose file lives on a server
    // rather than in the page. No video equivalent: playback would stream the file
    // back, which a chip on a sent message has no business doing.
    if (this._canPreviewURL(url) && type.startsWith('image/')) {
      return html`<a
        class="${prefix}-file-upload-item__preview-wrapper"
        href="${url}"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Open image">
        <img
          class="${prefix}-file-upload-item__preview"
          src="${url}"
          width="36"
          height="36"
          alt=""
          aria-hidden="true"
          @error="${() => {
            this._failedPreviewURL = url;
          }}" />
      </a>`;
    }

    // File type icon (for supported icons)
    const icon = pickFileTypeIcon(name, type);
    if (icon) {
      return html`<span
        class="${prefix}-file-upload-item__icon"
        aria-hidden="true"
        >${iconLoader(icon)}</span
      >`;
    }

    return nothing;
  }

  private _handleRemove() {
    if (!this.upload) {
      return;
    }

    this.dispatchEvent(
      new CustomEvent<FileRemoveEventDetail>('cds-aichat-file-remove', {
        detail: { fileId: this.upload.id },
        bubbles: true,
        composed: true,
      })
    );
  }

  render() {
    const resolved = this._resolved;
    if (!resolved) {
      return nothing;
    }

    // An empty state falls through Carbon's status switch, rendering no
    // affordance. `_syncInjectedStyles` collapses the container it still reserves.
    const state = this.readOnly ? '' : this._uploadStatus;
    const error = this._uploadError;

    return html`
      <cds-file-uploader-item
        size="md"
        .state="${state}"
        .iconDescription="${
          state === 'uploading'
            ? this.uploadingFileLabel
            : this.removeFileNamedLabel || this.removeFileLabel
        }"
        .errorSubject="${error.message}"
        ?invalid="${!this.readOnly && error.isError}"
        @cds-file-uploader-item-deleted="${this._handleRemove}">
        ${this._renderPreview()} ${resolved.name || this.fallbackLabel}
      </cds-file-uploader-item>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'cds-aichat-file-upload-item': FileUploadItemElement;
  }
}

export default FileUploadItemElement;
