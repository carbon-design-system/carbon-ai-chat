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
  EditorViewManager,
  applyEditorStyles,
} from "../editor-view-manager.js";

function makeHost() {
  const host = document.createElement("div");
  document.body.appendChild(host);
  return host;
}

function makeManager(host: HTMLElement, overrides: Partial<any> = {}) {
  const callbacks = {
    onFocus: () => {},
    onBlur: () => {},
    onKeydown: () => {},
    ...(overrides.callbacks ?? {}),
  };
  return new EditorViewManager({
    host,
    ariaLabel: "Message",
    disabled: false,
    plugins: [],
    callbacks,
    ...overrides,
  });
}

describe("EditorViewManager", () => {
  it("mounts a container with expected a11y attributes", () => {
    const host = makeHost();
    const manager = makeManager(host);
    manager.mount();

    const container = manager.container!;
    expect(container.getAttribute("role")).to.equal("textbox");
    expect(container.getAttribute("aria-label")).to.equal("Message");
    expect(container.getAttribute("aria-multiline")).to.equal("true");
    expect(container.slot).to.equal("editor");
    expect(host.contains(container)).to.equal(true);

    manager.destroy();
    host.remove();
  });

  it("creates an EditorView accessible via the getter", () => {
    const host = makeHost();
    const manager = makeManager(host);
    manager.mount();
    expect(manager.view).to.not.equal(null);
    manager.destroy();
    host.remove();
  });

  it("toggles editable via setDisabled", () => {
    const host = makeHost();
    const manager = makeManager(host);
    manager.mount();
    const view = manager.view!;
    expect(view.editable).to.equal(true);
    manager.setDisabled(true);
    expect(view.editable).to.equal(false);
    manager.setDisabled(false);
    expect(view.editable).to.equal(true);
    manager.destroy();
    host.remove();
  });

  it("removes the container and clears state on destroy", () => {
    const host = makeHost();
    const manager = makeManager(host);
    manager.mount();
    const container = manager.container!;
    manager.destroy();
    expect(host.contains(container)).to.equal(false);
    expect(manager.view).to.equal(null);
    expect(manager.container).to.equal(null);
    host.remove();
  });

  it("addContainerEventListener fires handler and auto-disposes on destroy", () => {
    const host = makeHost();
    const manager = makeManager(host);
    manager.mount();

    let count = 0;
    manager.addContainerEventListener("my-event", () => {
      count += 1;
    });
    manager.container!.dispatchEvent(new CustomEvent("my-event"));
    expect(count).to.equal(1);

    const detached = manager.container!;
    manager.destroy();
    // Dispatching on the detached node should not re-trigger (listener disposed).
    detached.dispatchEvent(new CustomEvent("my-event"));
    expect(count).to.equal(1);
    host.remove();
  });
});

describe("applyEditorStyles", () => {
  it("writes desktop-sized typography onto the element's style", () => {
    const el = document.createElement("div");
    applyEditorStyles(el, false);
    expect(el.style.margin).to.equal("0px");
    expect(el.style.fontSize).to.contain("0.875rem");
  });

  it("overrides typography for phone viewports", () => {
    const el = document.createElement("div");
    applyEditorStyles(el, true);
    expect(el.style.fontSize).to.contain("1rem");
  });
});
