/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { aTimeout, expect, fixture, html, oneEvent } from '@open-wc/testing';
import '@carbon/ai-chat-components/es/components/file-uploads/index.js';
import type FileUploadsElement from '@carbon/ai-chat-components/es/components/file-uploads/src/file-uploads.js';
import {
  FileStatusValue,
  type FileUpload,
} from '@carbon/ai-chat-components/es/components/prompt-line/src/types.js';

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

// Longer than the AriaAnnouncerManager's 250 ms NVDA debounce.
const ANNOUNCE_DELAY = 320;

const LIVE_REGION = '.cds-aichat--file-uploads-live-region';

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

function liveText(el: FileUploadsElement): string {
  return Array.from(el.renderRoot.querySelectorAll(LIVE_REGION))
    .map((region) => region.textContent ?? '')
    .join('')
    .trim();
}

function liveRegionCount(
  el: FileUploadsElement,
  politeness: 'polite' | 'assertive'
): number {
  return el.renderRoot.querySelectorAll(
    `${LIVE_REGION}[aria-live="${politeness}"]`
  ).length;
}

/** Text currently in one politeness channel's regions. */
function liveTextIn(
  el: FileUploadsElement,
  politeness: 'polite' | 'assertive'
): string {
  return Array.from(
    el.renderRoot.querySelectorAll(`${LIVE_REGION}[aria-live="${politeness}"]`)
  )
    .map((region) => region.textContent ?? '')
    .join('')
    .trim();
}

function clearRegions(el: FileUploadsElement): void {
  el.renderRoot
    .querySelectorAll(LIVE_REGION)
    .forEach((region) => (region.textContent = ''));
}

async function setUploads(
  el: FileUploadsElement,
  uploads: FileUpload[]
): Promise<void> {
  el.uploads = uploads;
  await el.updateComplete;
  await aTimeout(ANNOUNCE_DELAY);
}

async function mount(): Promise<FileUploadsElement> {
  return fixture<FileUploadsElement>(
    html`<cds-aichat-file-uploads></cds-aichat-file-uploads>`
  );
}

describe('file-uploads', () => {
  it('renders hidden live regions even when empty', async () => {
    const el = await mount();
    // Two regions per channel: the announcer rotates between them so that two
    // consecutive identical messages still register as a change and are spoken
    // twice rather than once.
    expect(liveRegionCount(el, 'polite')).to.equal(2);
    expect(liveRegionCount(el, 'assertive')).to.equal(2);
    expect(el.hasAttribute('has-uploads')).to.be.false;
  });

  it('reflects has-uploads when files are present', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    expect(el.hasAttribute('has-uploads')).to.be.true;
  });

  it('announces when a file is added', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    expect(liveTextIn(el, 'polite')).to.contain('File added.');
    expect(liveTextIn(el, 'assertive')).to.equal('');
  });

  it('announces an upload starting', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.UPLOADING)]);
    expect(liveTextIn(el, 'polite')).to.contain('Uploading file');
  });

  it('announces upload start when a staged file begins uploading', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    clearRegions(el);
    await setUploads(el, [makeUpload('a', FileStatusValue.UPLOADING)]);
    expect(liveTextIn(el, 'polite')).to.contain('Uploading file');
    expect(liveTextIn(el, 'assertive')).to.equal('');
  });

  it('coalesces several files added in one frame into one counted announcement', async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT),
      makeUpload('b', FileStatusValue.EDIT),
      makeUpload('c', FileStatusValue.EDIT),
    ]);
    // One counted message via the default formatter, not "File added." repeated.
    expect(liveTextIn(el, 'polite')).to.contain('3 files added.');
    expect(liveTextIn(el, 'polite')).to.not.contain('File added. File added.');
  });

  it('coalesces several files starting to upload in one frame', async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload('a', FileStatusValue.UPLOADING),
      makeUpload('b', FileStatusValue.UPLOADING),
    ]);
    expect(liveTextIn(el, 'polite')).to.contain('Uploading 2 files.');
  });

  it('uses the consumer-supplied formatter for counted announcements', async () => {
    const el = await mount();
    el.getFilesAddedText = ({ count }) => `added ${count} (custom)`;
    await el.updateComplete;
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT),
      makeUpload('b', FileStatusValue.EDIT),
    ]);
    expect(liveTextIn(el, 'polite')).to.contain('added 2 (custom)');
  });

  it('announces success on uploading -> settled transition', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.UPLOADING)]);
    clearRegions(el);
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    // Success does not block the user, so it stays on the polite channel.
    expect(liveTextIn(el, 'polite')).to.contain('uploaded successfully');
    expect(liveTextIn(el, 'assertive')).to.equal('');
  });

  it('announces failure assertively, carrying the file-specific reason', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.UPLOADING)]);
    clearRegions(el);
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Boom',
      }),
    ]);
    // A failed upload blocks sending, so it interrupts rather than queueing.
    expect(liveTextIn(el, 'assertive')).to.contain('error uploading');
    expect(liveTextIn(el, 'assertive')).to.contain('Boom');
    expect(liveTextIn(el, 'polite')).to.equal('');
  });

  it('keeps both reasons when two uploads fail in the same frame', async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload('a', FileStatusValue.UPLOADING),
      makeUpload('b', FileStatusValue.UPLOADING),
    ]);
    clearRegions(el);
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Too big',
      }),
      makeUpload('b', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Wrong type',
      }),
    ]);
    // Failures are not counted the way adds are — a count would lose the
    // per-file reason, which is the only thing that says what to fix.
    const announced = liveTextIn(el, 'assertive');
    expect(announced).to.contain('Too big');
    expect(announced).to.contain('Wrong type');
  });

  it('announces once when two uploads fail in the same frame', async () => {
    const el = await mount();
    el.getFileUploadFailureText = ({ messages }) =>
      `failed: ${messages.join(' | ')}`;
    await el.updateComplete;
    await setUploads(el, [
      makeUpload('a', FileStatusValue.UPLOADING),
      makeUpload('b', FileStatusValue.UPLOADING),
    ]);
    clearRegions(el);
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Too big',
      }),
      makeUpload('b', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Wrong type',
      }),
    ]);

    // One call carrying both reasons, so a shared title and recovery sentence are
    // not repeated inside a single interruption.
    expect(liveTextIn(el, 'assertive')).to.equal(
      'failed: Too big | Wrong type'
    );
  });

  it('re-announces when the reason changes on an already-failed upload', async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Too big',
      }),
    ]);
    clearRegions(el);
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Wrong type',
      }),
    ]);

    // The upload never leaves the error state, so the isError edge never fires.
    expect(liveTextIn(el, 'assertive')).to.contain('Wrong type');
  });

  it('announces a failure already present at mount', async () => {
    // The element remounts whenever the input is hidden and re-shown, and the
    // React side no longer announces upload errors — seeding a failure as
    // already-seen would leave it announced nowhere.
    const el = await fixture<FileUploadsElement>(
      html`<cds-aichat-file-uploads
        .uploads="${[
          makeUpload('ok', FileStatusValue.EDIT),
          makeUpload('bad', FileStatusValue.EDIT, {
            isError: true,
            errorMessage: 'Boom',
          }),
        ]}"></cds-aichat-file-uploads>`
    );
    await aTimeout(ANNOUNCE_DELAY);

    expect(liveTextIn(el, 'assertive')).to.contain('Boom');
    // The healthy file was already on screen, so it is not announced as added.
    expect(liveTextIn(el, 'polite')).to.equal('');
  });

  it('still honours uploadFailureLabel without a custom formatter', async () => {
    const el = await mount();
    // The label is public API on the published element. A standalone consumer
    // localizes by setting it alone, so the default formatter must build on it
    // rather than hardcode English.
    el.uploadFailureLabel = 'Upload failed.';
    await el.updateComplete;
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Boom',
      }),
    ]);
    expect(liveTextIn(el, 'assertive')).to.contain('Upload failed. Boom');
  });

  it('uses the consumer-supplied formatter for the failure announcement', async () => {
    const el = await mount();
    el.getFileUploadFailureText = ({ messages }) =>
      `nope (${messages.join(', ')})`;
    await el.updateComplete;
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, {
        isError: true,
        errorMessage: 'Boom',
      }),
    ]);
    expect(liveTextIn(el, 'assertive')).to.contain('nope (Boom)');
  });

  it('names each remove button after its own file', async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, { name: 'ok.txt' }),
      makeUpload('b', FileStatusValue.EDIT, { name: 'a-reject.txt' }),
    ]);

    const names = Array.from(
      el.renderRoot.querySelectorAll('cds-aichat-file-upload-item')
    ).map(
      (chip) =>
        chip
          .shadowRoot!.querySelector('cds-file-uploader-item')!
          .shadowRoot!.querySelector('button.cds--file-close')
          ?.getAttribute('aria-label') ?? ''
    );

    // Two buttons both called "Remove file" are indistinguishable to a screen
    // reader — WCAG 2.1 AA 4.1.2. The distinctness is the requirement, not the
    // wording.
    expect(names).to.have.lengthOf(2);
    expect(names[0]).to.contain('ok.txt');
    expect(names[1]).to.contain('a-reject.txt');
    expect(names[0]).to.not.equal(names[1]);
  });

  it('uses the consumer-supplied formatter for remove-button names', async () => {
    const el = await mount();
    el.getRemoveFileLabel = ({ name }) => `discard ${name}`;
    await el.updateComplete;
    await setUploads(el, [
      makeUpload('a', FileStatusValue.EDIT, { name: 'ok.txt' }),
    ]);

    const label = el.renderRoot
      .querySelector('cds-aichat-file-upload-item')!
      .shadowRoot!.querySelector('cds-file-uploader-item')!
      .shadowRoot!.querySelector('button.cds--file-close')
      ?.getAttribute('aria-label');
    expect(label).to.equal('discard ok.txt');
  });

  it('announces removal and fires the remove event on a user delete', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    clearRegions(el);

    // file-uploads renders <cds-aichat-file-upload-item> elements, not
    // <cds-file-uploader-item> directly. Simulate the remove event that
    // file-upload-item fires after the user clicks the inner delete button.
    const item = el.renderRoot.querySelector('cds-aichat-file-upload-item')!;
    setTimeout(() =>
      item.dispatchEvent(
        new CustomEvent('cds-aichat-file-remove', {
          detail: { fileId: 'testId' },
          bubbles: true,
          composed: true,
        })
      )
    );
    const event = await oneEvent(el, 'cds-aichat-file-remove');
    expect(event.detail.fileId).to.equal('testId');

    await aTimeout(ANNOUNCE_DELAY);
    expect(liveTextIn(el, 'polite')).to.contain('File removed.');
    expect(liveTextIn(el, 'assertive')).to.equal('');
  });

  it('does not announce when the list clears for other reasons (e.g. send)', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    clearRegions(el);
    await setUploads(el, []);
    expect(liveText(el)).to.equal('');
    expect(el.hasAttribute('has-uploads')).to.be.false;
  });

  it('does not re-announce on unrelated prop changes', async () => {
    const el = await mount();
    await setUploads(el, [makeUpload('a', FileStatusValue.EDIT)]);
    clearRegions(el);
    el.removeFileLabel = 'Remove this file';
    await el.updateComplete;
    await aTimeout(ANNOUNCE_DELAY);
    expect(liveText(el)).to.equal('');
  });

  it('disconnects cleanly without leaving pending announcements', async () => {
    const el = await mount();
    el.uploads = [makeUpload('a', FileStatusValue.UPLOADING)];
    await el.updateComplete;
    el.remove();
    await aTimeout(ANNOUNCE_DELAY);
    expect(el.isConnected).to.be.false;
  });
});
