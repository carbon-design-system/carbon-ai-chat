/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import {
  calculateRequiredWidth,
  hasSignificantWidthChange,
  isWideEnough,
  canHostGrow,
  getInlineSizeFromEntry,
  getCssLengthFromProperty,
  areWorkspaceAttributesCorrect,
  shouldSkipWorkspaceUpdate,
} from "../src/workspace-manager-utils.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

describe("workspace-manager-utils", () => {
  describe("calculateRequiredWidth", () => {
    it("sums the minimum widths", () => {
      expect(
        calculateRequiredWidth({
          workspaceMinWidth: 200,
          messagesMinWidth: 300,
          historyWidth: 120,
        }),
      ).to.equal(620);
    });
  });

  describe("hasSignificantWidthChange", () => {
    it("returns false when change equals threshold", () => {
      expect(hasSignificantWidthChange(101, 100, 1)).to.be.false;
    });

    it("returns true when change exceeds threshold", () => {
      expect(hasSignificantWidthChange(104, 100, 3)).to.be.true;
    });
  });

  describe("isWideEnough", () => {
    it("returns true when inline size meets requirement", () => {
      expect(isWideEnough(800, 640)).to.be.true;
    });

    it("returns false when inline size is too small", () => {
      expect(isWideEnough(500, 640)).to.be.false;
    });
  });

  describe("canHostGrow", () => {
    it("returns true when window is wide enough", () => {
      const requiredWidth = Math.max(0, window.innerWidth - 1);
      expect(canHostGrow(requiredWidth)).to.be.true;
    });

    it("returns false when required width exceeds window size", () => {
      const requiredWidth = window.innerWidth + 50;
      expect(canHostGrow(requiredWidth)).to.be.false;
    });
  });

  describe("getInlineSizeFromEntry", () => {
    it("uses borderBoxSize when provided", () => {
      const entry = {
        borderBoxSize: [{ inlineSize: 640 }],
        contentRect: { width: 320 },
      } as unknown as ResizeObserverEntry;
      expect(getInlineSizeFromEntry(entry)).to.equal(640);
    });

    it("falls back to contentRect width", () => {
      const entry = {
        contentRect: { width: 420 },
      } as ResizeObserverEntry;
      expect(getInlineSizeFromEntry(entry)).to.equal(420);
    });
  });

  describe("getCssLengthFromProperty", () => {
    it("parses numeric values from CSS custom properties", () => {
      const el = document.createElement("div");
      el.style.setProperty("--test-length", "480px");
      document.body.appendChild(el);

      expect(getCssLengthFromProperty(el, "--test-length", 200)).to.equal(480);

      document.body.removeChild(el);
    });

    it("returns fallback for empty or invalid values", () => {
      const el = document.createElement("div");
      el.style.setProperty("--test-length", "not-a-number");
      document.body.appendChild(el);

      expect(getCssLengthFromProperty(el, "--missing", 150)).to.equal(150);
      expect(getCssLengthFromProperty(el, "--test-length", 150)).to.equal(150);

      document.body.removeChild(el);
    });
  });

  describe("areWorkspaceAttributesCorrect", () => {
    it("validates panel/container attribute pairing", () => {
      const el = document.createElement("div");
      el.setAttribute("workspace-in-panel", "");
      expect(areWorkspaceAttributesCorrect(el, true)).to.be.true;

      el.removeAttribute("workspace-in-panel");
      el.setAttribute("workspace-in-container", "");
      expect(areWorkspaceAttributesCorrect(el, false)).to.be.true;
    });

    it("returns false when attributes are mismatched", () => {
      const el = document.createElement("div");
      el.setAttribute("workspace-in-panel", "");
      el.setAttribute("workspace-in-container", "");
      expect(areWorkspaceAttributesCorrect(el, true)).to.be.false;
    });
  });

  describe("shouldSkipWorkspaceUpdate", () => {
    it("skips when workspace is disabled or container hidden", () => {
      expect(
        shouldSkipWorkspaceUpdate(
          { showWorkspace: false },
          { containerVisible: true, isContracting: false },
        ),
      ).to.be.true;
      expect(
        shouldSkipWorkspaceUpdate(
          { showWorkspace: true },
          { containerVisible: false, isContracting: false },
        ),
      ).to.be.true;
    });

    it("skips when contracting", () => {
      expect(
        shouldSkipWorkspaceUpdate(
          { showWorkspace: true },
          { containerVisible: true, isContracting: true },
        ),
      ).to.be.true;
    });

    it("does not skip when ready to update", () => {
      expect(
        shouldSkipWorkspaceUpdate(
          { showWorkspace: true },
          { containerVisible: true, isContracting: false },
        ),
      ).to.be.false;
    });
  });
});
