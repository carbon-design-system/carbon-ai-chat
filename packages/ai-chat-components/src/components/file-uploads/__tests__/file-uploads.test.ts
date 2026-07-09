/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { aTimeout, expect, fixture, html, oneEvent } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/file-uploads/index.js";
import type FileUploadsElement from "@carbon/ai-chat-components/es/components/file-uploads/src/file-uploads.js";
import {
  FileStatusValue,
  type FileUpload,
} from "@carbon/ai-chat-components/es/components/input/src/types.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

// Longer than the AriaAnnouncerManager's 250 ms NVDA debounce.
const ANNOUNCE_DELAY = 320;

const LIVE_REGION = ".cds-aichat--file-uploads-live-region";

function makeUpload(
  id: string,
  status: FileStatusValue,
  opts: { isError?: boolean; errorMessage?: string; name?: string } = {},
): FileUpload {
  return {
    id,
    file: new File(["x"], opts.name ?? `${id}.txt`, { type: "text/plain" }),
    status,
    isError: opts.isError,
    errorMessage: opts.errorMessage,
  };
}

function liveText(el: FileUploadsElement): string {
  return Array.from(el.renderRoot.querySelectorAll(LIVE_REGION))
    .map((region) => region.textContent ?? "")
    .join("")
    .trim();
}

function clearRegions(el: FileUploadsElement): void {
  el.renderRoot
    .querySelectorAll(LIVE_REGION)
    .forEach((region) => (region.textContent = ""));
}

async function setUploads(
  el: FileUploadsElement,
  uploads: FileUpload[],
): Promise<void> {
  el.uploads = uploads;
  await el.updateComplete;
  await aTimeout(ANNOUNCE_DELAY);
}

async function mount(): Promise<FileUploadsElement> {
  return fixture<FileUploadsElement>(
    html`<cds-aichat-file-uploads></cds-aichat-file-uploads>`,
  );
}

describe("file-uploads", () => {
  it("renders hidden live regions even when empty", async () => {
    const el = await mount();
    expect(el.renderRoot.querySelectorAll(LIVE_REGION).length).to.equal(2);
    expect(el.hasAttribute("has-uploads")).to.be.false;
  });

  it("reflects has-uploads when files are present", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    expect(el.hasAttribute("has-uploads")).to.be.true;
  });

  it("announces when a file is added", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    expect(liveText(el)).to.contain("File added.");
  });

  it("announces an upload starting", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.UPLOADING)]);
    expect(liveText(el)).to.contain("Uploading file");
  });

  it("announces upload start when a staged file begins uploading", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    clearRegions(el);
    await setUploads(el, [makeUpload("a", FileStatusValue.UPLOADING)]);
    expect(liveText(el)).to.contain("Uploading file");
  });

  it("coalesces several files added in one frame into one counted announcement", async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload("a", FileStatusValue.EDIT),
      makeUpload("b", FileStatusValue.EDIT),
      makeUpload("c", FileStatusValue.EDIT),
    ]);
    // One counted message via the default formatter, not "File added." repeated.
    expect(liveText(el)).to.contain("3 files added.");
    expect(liveText(el)).to.not.contain("File added. File added.");
  });

  it("coalesces several files starting to upload in one frame", async () => {
    const el = await mount();
    await setUploads(el, [
      makeUpload("a", FileStatusValue.UPLOADING),
      makeUpload("b", FileStatusValue.UPLOADING),
    ]);
    expect(liveText(el)).to.contain("Uploading 2 files.");
  });

  it("uses the consumer-supplied formatter for counted announcements", async () => {
    const el = await mount();
    el.getFilesAddedText = ({ count }) => `added ${count} (custom)`;
    await el.updateComplete;
    await setUploads(el, [
      makeUpload("a", FileStatusValue.EDIT),
      makeUpload("b", FileStatusValue.EDIT),
    ]);
    expect(liveText(el)).to.contain("added 2 (custom)");
  });

  it("announces success on uploading -> settled transition", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.UPLOADING)]);
    clearRegions(el);
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    expect(liveText(el)).to.contain("uploaded successfully");
  });

  it("announces failure when an upload errors", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.UPLOADING)]);
    clearRegions(el);
    await setUploads(el, [
      makeUpload("a", FileStatusValue.EDIT, {
        isError: true,
        errorMessage: "Boom",
      }),
    ]);
    expect(liveText(el)).to.contain("error uploading");
  });

  it("announces removal and fires the remove event on a user delete", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    clearRegions(el);

    // file-uploads renders <cds-aichat-file-upload-item> elements, not
    // <cds-file-uploader-item> directly. Simulate the remove event that
    // file-upload-item fires after the user clicks the inner delete button.
    const item = el.renderRoot.querySelector("cds-aichat-file-upload-item")!;
    setTimeout(() =>
      item.dispatchEvent(
        new CustomEvent("cds-aichat-file-remove", {
          detail: { fileId: "testId" },
          bubbles: true,
          composed: true,
        }),
      ),
    );
    const event = await oneEvent(el, "cds-aichat-file-remove");
    expect(event.detail.fileId).to.equal("testId");

    await aTimeout(ANNOUNCE_DELAY);
    expect(liveText(el)).to.contain("File removed.");
  });

  it("does not announce when the list clears for other reasons (e.g. send)", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    clearRegions(el);
    await setUploads(el, []);
    expect(liveText(el)).to.equal("");
    expect(el.hasAttribute("has-uploads")).to.be.false;
  });

  it("does not re-announce on unrelated prop changes", async () => {
    const el = await mount();
    await setUploads(el, [makeUpload("a", FileStatusValue.EDIT)]);
    clearRegions(el);
    el.removeFileLabel = "Remove this file";
    await el.updateComplete;
    await aTimeout(ANNOUNCE_DELAY);
    expect(liveText(el)).to.equal("");
  });

  it("disconnects cleanly without leaving pending announcements", async () => {
    const el = await mount();
    el.uploads = [makeUpload("a", FileStatusValue.UPLOADING)];
    await el.updateComplete;
    el.remove();
    await aTimeout(ANNOUNCE_DELAY);
    expect(el.isConnected).to.be.false;
  });
});
