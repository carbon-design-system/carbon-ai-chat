/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";

import WriteableElement from "./components/util/WriteableElement";
import { WriteableElementName } from "../types/instance/ChatInstance";
import { RenderWriteableElementResponse } from "../types/component/ChatContainer";
import { HasServiceManager } from "./hocs/withServiceManager";

interface AppShellWriteableElementsProps extends HasServiceManager {
  showHomeScreen: boolean;
  renderWriteableElements?: RenderWriteableElementResponse;
}

/**
 * Configuration for a single WriteableElement.
 */
interface ElementConfig {
  wrapperSlot: string;
  slotName:
    | WriteableElementName
    | ((showHomeScreen: boolean) => WriteableElementName);
  idSuffix: string | ((showHomeScreen: boolean) => string);
  className: string | ((showHomeScreen: boolean) => string);
}

/**
 * Resolves a value that may be static or conditional based on showHomeScreen.
 */
function resolveValue<T>(value: T | ((flag: boolean) => T), flag: boolean): T {
  return typeof value === "function"
    ? (value as (flag: boolean) => T)(flag)
    : value;
}

/**
 * Configuration array for all writeable elements in the app shell.
 */
const ELEMENT_CONFIGS: ElementConfig[] = [
  {
    wrapperSlot: "header-after",
    slotName: (show) =>
      show
        ? WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT
        : WriteableElementName.HEADER_BOTTOM_ELEMENT,
    idSuffix: (show) =>
      show ? "homeScreenHeaderBottomElement" : "headerBottomElement",
    className: (show) =>
      show
        ? "cds-aichat--home-screen__home-screen-bottom-element"
        : "cds-aichat--header-bottom-element",
  },
  {
    wrapperSlot: "messages-before",
    slotName: WriteableElementName.MESSAGES_BEFORE_ELEMENT,
    idSuffix: "messagesBeforeElement",
    className: "cds-aichat--messages-before-element",
  },
  {
    wrapperSlot: "messages-after",
    slotName: WriteableElementName.MESSAGES_AFTER_ELEMENT,
    idSuffix: "messagesAfterElement",
    className: "cds-aichat--messages-after-element",
  },
  {
    wrapperSlot: "input-before",
    slotName: (show) =>
      show
        ? WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT
        : WriteableElementName.BEFORE_INPUT_ELEMENT,
    idSuffix: (show) =>
      show ? "homeScreenBeforeInputElement" : "beforeInputElement",
    className: (show) =>
      show
        ? "cds-aichat--home-screen-before-input-element"
        : "cds-aichat--before-input-element",
  },
  {
    wrapperSlot: "input-after",
    slotName: WriteableElementName.AFTER_INPUT_ELEMENT,
    idSuffix: "afterInputElement",
    className: "cds-aichat--after-input-element",
  },
  {
    wrapperSlot: "footer",
    slotName: WriteableElementName.FOOTER_ELEMENT,
    idSuffix: "footerElement",
    className: "cds-aichat--footer-element",
  },
];

/**
 * Renders WriteableElement slots that live directly under ChatShell.
 */
export function AppShellWriteableElements({
  serviceManager,
  showHomeScreen,
  renderWriteableElements,
}: AppShellWriteableElementsProps) {
  const suffix = serviceManager.namespace.suffix;

  const elements = useMemo(
    () =>
      ELEMENT_CONFIGS.map((config) => ({
        wrapperSlot: config.wrapperSlot,
        slotName: resolveValue(config.slotName, showHomeScreen),
        id: `${resolveValue(config.idSuffix, showHomeScreen)}${suffix}`,
        className: resolveValue(config.className, showHomeScreen),
      })).filter((element) => {
        // Only render the element if content exists in renderWriteableElements
        // If renderWriteableElements is not provided, render all elements (backward compatibility)
        if (!renderWriteableElements) {
          return true;
        }
        return !!renderWriteableElements[
          element.slotName as WriteableElementName
        ];
      }),
    [showHomeScreen, suffix, renderWriteableElements],
  );

  return (
    <>
      {elements.map((props) => (
        <WriteableElement key={props.wrapperSlot} {...props} />
      ))}
    </>
  );
}
