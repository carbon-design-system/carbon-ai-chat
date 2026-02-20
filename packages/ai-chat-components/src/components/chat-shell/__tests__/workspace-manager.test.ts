/**
 * @license
 *
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { expect } from "@open-wc/testing";
import { WorkspaceManager } from "../src/workspace-manager.js";

/**
 * This repository uses the @web/test-runner library for testing
 * Documentation on writing tests, plugins, and commands
 * here: https://modern-web.dev/docs/test-runner/overview/
 */

type LayoutWidths = {
  workspaceMinWidth: number;
  messagesMinWidth: number;
  historyWidth: number;
};

const setLayoutWidths = (host: HTMLElement, widths: LayoutWidths) => {
  host.style.setProperty(
    "--cds-aichat-workspace-min-width",
    `${widths.workspaceMinWidth}px`,
  );
  host.style.setProperty(
    "--cds-aichat-messages-min-width",
    `${widths.messagesMinWidth}px`,
  );
  host.style.setProperty(
    "--cds-aichat-history-width",
    `${widths.historyWidth}px`,
  );
};

const createHost = (width: number) => {
  const host = document.createElement("div");
  let currentWidth = width;

  host.getBoundingClientRect = () =>
    ({
      width: currentWidth,
      height: 0,
      top: 0,
      left: 0,
      right: currentWidth,
      bottom: 0,
      x: 0,
      y: 0,
      toJSON() {},
    }) as DOMRect;

  return {
    host,
    setWidth: (nextWidth: number) => {
      currentWidth = nextWidth;
    },
  };
};

const createManager = (options: {
  hostWidth: number;
  layoutWidths: LayoutWidths;
  showWorkspace: boolean;
  showHistory?: boolean;
}) => {
  const shellRoot = document.createElement("div");
  const { host, setWidth } = createHost(options.hostWidth);
  document.body.appendChild(host);

  setLayoutWidths(host, options.layoutWidths);

  const manager = new WorkspaceManager(shellRoot, host, {
    showWorkspace: options.showWorkspace,
    showHistory: options.showHistory ?? false,
    workspaceLocation: "start",
    roundedCorners: false,
  });

  return { manager, host, shellRoot, setWidth };
};

let originalConsoleTrace: typeof console.trace;

beforeEach(() => {
  originalConsoleTrace = console.trace;
  console.trace = () => {};
});

afterEach(() => {
  console.trace = originalConsoleTrace;
});

describe("WorkspaceManager", () => {
  it("renders workspace inline when the host is wide enough", () => {
    const { manager, host, shellRoot } = createManager({
      hostWidth: 720,
      layoutWidths: {
        workspaceMinWidth: 200,
        messagesMinWidth: 300,
        historyWidth: 0,
      },
      showWorkspace: true,
    });

    manager.connect();

    const state = manager.getState();
    expect(host.hasAttribute("workspace-in-container")).to.be.true;
    expect(host.hasAttribute("workspace-in-panel")).to.be.false;
    expect(state.containerVisible).to.be.true;
    expect(state.inPanel).to.be.false;
    expect(state.contentVisible).to.be.true;
    expect(manager.shouldRenderInline()).to.be.true;
    expect(manager.shouldRenderPanel()).to.be.false;
    expect(shellRoot.classList.contains("workspace-checking")).to.be.false;

    manager.disconnect();
    document.body.removeChild(host);
  });

  it("renders workspace in a panel when the host cannot grow", () => {
    const requiredWidth = window.innerWidth + 200;
    const { manager, host } = createManager({
      hostWidth: requiredWidth - 100,
      layoutWidths: {
        workspaceMinWidth: requiredWidth - 300,
        messagesMinWidth: 300,
        historyWidth: 0,
      },
      showWorkspace: true,
    });

    manager.connect();

    const state = manager.getState();
    expect(host.hasAttribute("workspace-in-panel")).to.be.true;
    expect(host.hasAttribute("workspace-in-container")).to.be.false;
    expect(state.inPanel).to.be.true;
    expect(state.containerVisible).to.be.true;
    expect(manager.shouldRenderPanel()).to.be.true;
    expect(manager.shouldRenderInline()).to.be.false;

    manager.disconnect();
    document.body.removeChild(host);
  });

  it("enters expansion checking when the host may grow", () => {
    const requiredWidth = Math.max(640, window.innerWidth - 100);
    const { manager, host, shellRoot } = createManager({
      hostWidth: requiredWidth - 120,
      layoutWidths: {
        workspaceMinWidth: requiredWidth - 300,
        messagesMinWidth: 300,
        historyWidth: 0,
      },
      showWorkspace: true,
    });

    manager.connect();

    const state = manager.getState();
    expect(state.isCheckingExpansion).to.be.true;
    expect(state.containerVisible).to.be.true;
    expect(state.contentVisible).to.be.false;
    expect(shellRoot.classList.contains("workspace-checking")).to.be.true;
    expect(manager.shouldRenderInline()).to.be.true;
    expect(manager.shouldRenderPanel()).to.be.false;

    manager.disconnect();
    document.body.removeChild(host);
  });

  it("clears workspace attributes when disabled", () => {
    const requiredWidth = window.innerWidth + 200;
    const { manager, host } = createManager({
      hostWidth: requiredWidth - 100,
      layoutWidths: {
        workspaceMinWidth: requiredWidth - 320,
        messagesMinWidth: 320,
        historyWidth: 0,
      },
      showWorkspace: true,
    });

    manager.connect();
    expect(host.hasAttribute("workspace-in-panel")).to.be.true;

    manager.updateConfig({ showWorkspace: false });

    const state = manager.getState();
    expect(host.hasAttribute("workspace-in-panel")).to.be.false;
    expect(host.hasAttribute("workspace-in-container")).to.be.false;
    expect(state.containerVisible).to.be.false;
    expect(state.inPanel).to.be.false;
    expect(manager.shouldRenderInline()).to.be.false;

    manager.disconnect();
    document.body.removeChild(host);
  });

  it("recalculates panel state when showHistory toggles", () => {
    const { manager, host } = createManager({
      hostWidth: 600,
      layoutWidths: {
        workspaceMinWidth: 200,
        messagesMinWidth: 300,
        historyWidth: 200,
      },
      showWorkspace: true,
      showHistory: false,
    });

    manager.connect();
    expect(host.hasAttribute("workspace-in-container")).to.be.true;

    manager.updateConfig({ showHistory: true });

    expect(host.hasAttribute("workspace-in-panel")).to.be.true;
    expect(host.hasAttribute("workspace-in-container")).to.be.false;

    manager.disconnect();
    document.body.removeChild(host);
  });
});
