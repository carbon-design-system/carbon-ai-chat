/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { render } from "@testing-library/react";
import { createElement } from "react";
import { carbonIconToReact } from "../../../src/chat/utils/carbonIcon";

const mockIcon = {
  elem: "svg" as const,
  attrs: {
    viewBox: "0 0 16 16",
    width: 16,
    height: 16,
  },
  content: [
    {
      elem: "path",
      attrs: {
        d: "M8 1l6.25 11H1.75L8 1z",
        "fill-rule": "evenodd",
      },
    },
  ],
};

describe("carbonIconToReact", () => {
  it("should create a React component from a Carbon icon", () => {
    const IconComponent = carbonIconToReact(mockIcon);
    const { container } = render(createElement(IconComponent, {}));

    const svg = container.querySelector("svg");
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute("viewBox")).toBe("0 0 16 16");
  });

  it("should convert kebab-case props to camelCase", () => {
    const IconComponent = carbonIconToReact(mockIcon);
    const { container } = render(
      createElement(IconComponent, {
        "stroke-width": "2",
        "stroke-linecap": "round",
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("stroke-width")).toBe("2");
    expect(svg?.getAttribute("stroke-linecap")).toBe("round");
  });

  it("should preserve aria-* attributes in kebab-case", () => {
    const IconComponent = carbonIconToReact(mockIcon);
    const { container } = render(
      createElement(IconComponent, {
        "aria-label": "Test icon",
        "aria-hidden": "true",
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("aria-label")).toBe("Test icon");
    expect(svg?.getAttribute("aria-hidden")).toBe("true");
  });

  it("should preserve data-* attributes in kebab-case", () => {
    const IconComponent = carbonIconToReact(mockIcon);
    const { container } = render(
      createElement(IconComponent, {
        "data-testid": "icon",
        "data-custom": "value",
      }),
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("data-testid")).toBe("icon");
    expect(svg?.getAttribute("data-custom")).toBe("value");
  });

  it("should transform child element attributes", () => {
    const IconComponent = carbonIconToReact(mockIcon);
    const { container } = render(createElement(IconComponent, {}));

    const path = container.querySelector("path");
    // React uses camelCase props but renders kebab-case attributes in the DOM for SVG
    expect(path?.getAttribute("fill-rule")).toBe("evenodd");
    expect(path?.getAttribute("fillRule")).toBeNull();
  });

  it("should apply default width, height, and fill", () => {
    const iconWithoutDefaults = {
      ...mockIcon,
      attrs: { viewBox: "0 0 16 16" },
    };

    const IconComponent = carbonIconToReact(iconWithoutDefaults);
    const { container } = render(createElement(IconComponent, {}));

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("16");
    expect(svg?.getAttribute("height")).toBe("16");
    expect(svg?.getAttribute("fill")).toBe("currentColor");
  });

  it("should override defaults with provided props", () => {
    const IconComponent = carbonIconToReact(mockIcon);
    const { container } = render(
      createElement(IconComponent, { width: 32, height: 32, fill: "red" }),
    );

    const svg = container.querySelector("svg");
    expect(svg?.getAttribute("width")).toBe("32");
    expect(svg?.getAttribute("height")).toBe("32");
    expect(svg?.getAttribute("fill")).toBe("red");
  });
});
