/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, oneEvent } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/file-uploads/index.js';
import type FileUploadItemElement from '@carbon/ai-chat-components/es/components/file-uploads/src/file-upload-item.js';
import {
  FileStatusValue,
  type FileUpload,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';
import type { FileAttachment } from '@carbon/ai-chat-components/es/components/file-uploads/src/types.js';

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

function makeUpload(
  id: string,
  status: FileStatusValue,
  opts: { isError?: boolean; errorMessage?: string; name?: string } = {}
): FileUpload {
  return {
    id,
    file: new File(['x'], opts.name ?? `${id}.txt`, { type: 'text/plain' }),
    status,
    isError: opts.isError,
    errorMessage: opts.errorMessage,
  };
}

async function mount(upload: FileUpload): Promise<FileUploadItemElement> {
  return fixture<FileUploadItemElement>(
    html`<cds-aichat-file-upload-item
      .upload="${upload}"></cds-aichat-file-upload-item>`
  );
}

describe('file-upload-item', () => {
  it('renders a cds-file-uploader-item inside its shadow root', async () => {
    const el = await mount(makeUpload('a', FileStatusValue.EDIT));
    expect(el.renderRoot.querySelector('cds-file-uploader-item')).to.exist;
  });

  it('forwards cds-file-uploader-item-deleted as cds-aichat-file-remove with the correct fileId', async () => {
    const el = await mount(makeUpload('a', FileStatusValue.EDIT));

    const uploaderItem = el.renderRoot.querySelector('cds-file-uploader-item')!;
    setTimeout(() =>
      uploaderItem.dispatchEvent(
        new CustomEvent('cds-file-uploader-item-deleted', {
          bubbles: true,
          composed: true,
        })
      )
    );

    const event = await oneEvent(el, 'cds-aichat-file-remove');
    expect(event.detail.fileId).to.equal('a');
  });

  it('does not fire cds-aichat-file-remove when upload is null', async () => {
    const el = await fixture<FileUploadItemElement>(
      html`<cds-aichat-file-upload-item></cds-aichat-file-upload-item>`
    );
    // Nothing rendered; confirm no uploader item is present.
    expect(el.renderRoot.querySelector('cds-file-uploader-item')).to.not.exist;
  });

  it('still renders a file-type icon after the icon picker extraction', async () => {
    // makeUpload always builds a text/plain File, and PDF precedes TXT in the
    // shared icon map, so a .pdf name resolves to the PDF icon.
    const el = await mount(
      makeUpload('a', FileStatusValue.EDIT, { name: 'a.pdf' })
    );
    expect(
      el.renderRoot.querySelector('.cds-aichat-file-upload-item__icon svg')
    ).to.exist;
  });

  describe('read-only (a file on a sent message)', () => {
    async function mountReadOnly(
      attachment: FileAttachment
    ): Promise<FileUploadItemElement> {
      return fixture<FileUploadItemElement>(
        html`<cds-aichat-file-upload-item
          read-only
          fallback-label="Attachment"
          .upload="${attachment}"></cds-aichat-file-upload-item>`
      );
    }

    function innerItem(el: FileUploadItemElement) {
      return el.renderRoot.querySelector('cds-file-uploader-item')!;
    }

    it('renders the attachment name with no File present', async () => {
      const el = await mountReadOnly({ id: 'a', name: 'report.pdf' });
      expect(el.renderRoot.textContent).to.contain('report.pdf');
    });

    it('falls back to the fallback label when the name is unknown', async () => {
      // A File cannot be serialized into history, so a restored inline file has no
      // name left to show.
      const el = await mountReadOnly({ id: 'a' });
      expect(el.renderRoot.textContent).to.contain('Attachment');
    });

    it('renders no status affordance', async () => {
      const el = await mountReadOnly({ id: 'a', name: 'report.pdf' });
      // An empty state falls through Carbon's status switch.
      expect(innerItem(el).getAttribute('state')).to.not.equal('edit');
      expect(innerItem(el).getAttribute('state')).to.not.equal('complete');
      expect(innerItem(el).getAttribute('state')).to.not.equal('uploading');
    });

    it('collapses the status container Carbon reserves unconditionally', async () => {
      // Without this the chip carries 36px of dead trailing space. Carbon exposes
      // no part= for it, so the rule is injected into its shadow root.
      const el = await mountReadOnly({ id: 'a', name: 'report.pdf' });
      const injected = Array.from(
        innerItem(el).shadowRoot?.querySelectorAll('style') ?? []
      ).map((style) => style.textContent ?? '');
      expect(
        injected.some((text) => text.includes('.cds--file__state-container'))
      ).to.be.true;
    });

    it('picks a file-type icon from the mime type alone', async () => {
      const el = await mountReadOnly({
        id: 'a',
        mimeType: 'application/pdf',
      });
      expect(
        el.renderRoot.querySelector('.cds-aichat-file-upload-item__icon svg')
      ).to.exist;
    });

    it('previews an image from a stated url when there is no File', async () => {
      // The shape a server-side upload leaves behind: metadata plus the URL the
      // file was stored at, and no File in the page at all.
      const el = await mountReadOnly({
        id: 'a',
        name: 'photo.png',
        mimeType: 'image/png',
        url: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
      });
      const preview = el.renderRoot.querySelector<HTMLImageElement>(
        'img.cds-aichat-file-upload-item__preview'
      );
      expect(preview).to.exist;
      expect(preview!.getAttribute('src')).to.contain('data:image/gif');
    });

    it('falls back to an icon for a non-image url', async () => {
      // Only images preview from a URL. Anything else keeps its file-type icon —
      // a chip on a sent message has no business fetching the file back.
      const el = await mountReadOnly({
        id: 'a',
        name: 'report.pdf',
        mimeType: 'application/pdf',
        url: 'https://example.com/report.pdf',
      });
      expect(
        el.renderRoot.querySelector('.cds-aichat-file-upload-item__preview')
      ).to.not.exist;
      expect(
        el.renderRoot.querySelector('.cds-aichat-file-upload-item__icon svg')
      ).to.exist;
    });

    it('drops the preview when a stated url fails to load', async () => {
      // A URL can go dead between the send and the render — a signed link expires,
      // or an object URL outlives the page that minted it. Better no preview than a
      // broken-image glyph.
      const el = await mountReadOnly({
        id: 'a',
        name: 'photo.png',
        mimeType: 'image/png',
        url: 'https://example.invalid/photo.png',
      });

      const image = el.renderRoot.querySelector<HTMLImageElement>(
        'img.cds-aichat-file-upload-item__preview'
      );
      expect(image).to.exist;

      image!.dispatchEvent(new Event('error'));
      await el.updateComplete;

      expect(
        el.renderRoot.querySelector('img.cds-aichat-file-upload-item__preview')
      ).to.not.exist;
    });

    it('previews a File carried on an attachment, which has no upload status', async () => {
      // The shape an inline file takes on a sent message: the live File, but none
      // of the upload bookkeeping.
      const el = await mountReadOnly({
        id: 'a',
        name: 'photo.png',
        mimeType: 'image/png',
        file: new File(['x'], 'photo.png', { type: 'image/png' }),
      });
      expect(
        el.renderRoot.querySelector('img.cds-aichat-file-upload-item__preview')
      ).to.exist;
    });

    it('renders a video preview using the objectURL', async () => {
      const file = new File(['data'], 'clip.mp4', { type: 'video/mp4' });
      const el = await mountReadOnly({
        id: 'a',
        name: 'clip.mp4',
        mimeType: 'video/mp4',
        file,
      });

      const video = el.renderRoot.querySelector<HTMLVideoElement>(
        'video.cds-aichat-file-upload-item__preview'
      );
      expect(video).to.exist;

      // The src must be an object URL (blob:), never a plain http/data path.
      expect(video!.getAttribute('src')).to.match(/^blob:/);
    });

    it('never creates an object URL when there is no File', async () => {
      const original = URL.createObjectURL;
      let calls = 0;
      URL.createObjectURL = ((...args: unknown[]) => {
        calls += 1;
        return (original as (...a: unknown[]) => string)(...args);
      }) as typeof URL.createObjectURL;

      try {
        await mountReadOnly({
          id: 'a',
          name: 'photo.png',
          mimeType: 'image/png',
        });
        expect(calls).to.equal(0);
      } finally {
        URL.createObjectURL = original;
      }
    });

    it('still shows a media preview when a live File is present', async () => {
      // A just-sent image renders its thumbnail; the same message after a reload
      // has no File and falls back to an icon.
      const el = await fixture<FileUploadItemElement>(
        html`<cds-aichat-file-upload-item
          read-only
          .upload="${{
            id: 'a',
            file: new File(['x'], 'photo.png', { type: 'image/png' }),
            status: FileStatusValue.COMPLETE,
          }}"></cds-aichat-file-upload-item>`
      );
      expect(
        el.renderRoot.querySelector('.cds-aichat-file-upload-item__preview')
      ).to.exist;
    });
  });

  it('reflects isError state onto the inner cds-file-uploader-item', async () => {
    const el = await mount(
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Too large',
      })
    );
    const uploaderItem = el.renderRoot.querySelector('cds-file-uploader-item')!;
    expect(uploaderItem.hasAttribute('invalid')).to.be.true;
  });
});
