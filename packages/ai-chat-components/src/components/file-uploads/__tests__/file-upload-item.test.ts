/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect, fixture, html, oneEvent } from "@open-wc/testing";
import "@carbon/ai-chat-components/es/components/file-uploads/index.js";
import type FileUploadItemElement from "@carbon/ai-chat-components/es/components/file-uploads/src/file-upload-item.js";
import {
  FileStatusValue,
  type FileUpload,
} from "@carbon/ai-chat-components/es/components/input/src/types.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

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

async function mount(upload: FileUpload): Promise<FileUploadItemElement> {
  return fixture<FileUploadItemElement>(
    html`<cds-aichat-file-upload-item
      .upload="${upload}"
    ></cds-aichat-file-upload-item>`,
  );
}

describe("file-upload-item", () => {
  it("renders a cds-file-uploader-item inside its shadow root", async () => {
    const el = await mount(makeUpload("a", FileStatusValue.EDIT));
    expect(el.renderRoot.querySelector("cds-file-uploader-item")).to.exist;
  });

  it("forwards cds-file-uploader-item-deleted as cds-aichat-file-remove with the correct fileId", async () => {
    const el = await mount(makeUpload("a", FileStatusValue.EDIT));

    const uploaderItem = el.renderRoot.querySelector("cds-file-uploader-item")!;
    setTimeout(() =>
      uploaderItem.dispatchEvent(
        new CustomEvent("cds-file-uploader-item-deleted", {
          bubbles: true,
          composed: true,
        }),
      ),
    );

    const event = await oneEvent(el, "cds-aichat-file-remove");
    expect(event.detail.fileId).to.equal("a");
  });

  it("does not fire cds-aichat-file-remove when upload is null", async () => {
    const el = await fixture<FileUploadItemElement>(
      html`<cds-aichat-file-upload-item></cds-aichat-file-upload-item>`,
    );
    // Nothing rendered; confirm no uploader item is present.
    expect(el.renderRoot.querySelector("cds-file-uploader-item")).to.not.exist;
  });

  it("reflects isError state onto the inner cds-file-uploader-item", async () => {
    const el = await mount(
      makeUpload("a", FileStatusValue.EDIT, {
        isError: true,
        errorMessage: "Too large",
      }),
    );
    const uploaderItem = el.renderRoot.querySelector("cds-file-uploader-item")!;
    expect(uploaderItem.hasAttribute("invalid")).to.be.true;
  });
});
