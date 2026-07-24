/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import React, { useMemo } from "react";

import WriteableElement from "./components/helpers/WriteableElement/WriteableElement";
import { WriteableElementName } from "../types/instance/WriteableElements";
import { HasServiceManager } from "./hocs/withServiceManager";
import { useSelector } from "./hooks/useSelector";
import { AppState } from "../types/state/AppState";

interface AppShellWriteableElementsProps extends HasServiceManager {
  showHomeScreen: boolean;
  /**
   * Value-stable, space-separated, sorted list of writeable-element slot names
   * the host supplied content for (see `ChatAppEntry`). `undefined` means the
   * host omitted the map entirely — render all default elements (back-compat);
   * an empty string means a map was provided with no content — render none.
   */
  writeableElementsPresentKeys?: string;
}

/**
 * Configuration for a single WriteableElement.
 */
interface ElementConfig {
  wrapperSlot: string;
  slotName:
    WriteableElementName | ((showHomeScreen: boolean) => WriteableElementName);
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
export const AppShellWriteableElements = React.memo(
  function AppShellWriteableElements({
    serviceManager,
    showHomeScreen,
    writeableElementsPresentKeys,
  }: AppShellWriteableElementsProps) {
    const suffix = serviceManager.namespace.suffix;
    const hasContentMaxWidth = useSelector(
      (state: AppState) =>
        state.config.derived.header.hasContentMaxWidth ?? false,
    );

    // `null` => host omitted the map entirely (render all, back-compat). A Set
    // (possibly empty) => only render slots the host supplied content for.
    const presentKeySet = useMemo(
      () =>
        writeableElementsPresentKeys === undefined
          ? null
          : new Set(
              writeableElementsPresentKeys
                ? writeableElementsPresentKeys.split(" ")
                : [],
            ),
      [writeableElementsPresentKeys],
    );

    const elements = useMemo(
      () =>
        ELEMENT_CONFIGS.map((config) => {
          const baseClassName = resolveValue(config.className, showHomeScreen);
          // Add constrain-width class to header-bottom-element if configured
          const isHeaderBottomElement =
            baseClassName === "cds-aichat--header-bottom-element";
          const className =
            isHeaderBottomElement && hasContentMaxWidth
              ? `${baseClassName} cds-aichat--header-constrain-width`
              : baseClassName;

          return {
            wrapperSlot: config.wrapperSlot,
            slotName: resolveValue(config.slotName, showHomeScreen),
            id: `${resolveValue(config.idSuffix, showHomeScreen)}${suffix}`,
            className,
          };
        }).filter((element) => {
          // Only render the element if the host supplied content for its slot.
          // `null` (host omitted the map) renders all elements (back-compat).
          if (presentKeySet === null) {
            return true;
          }
          return presentKeySet.has(element.slotName);
        }),
      [showHomeScreen, suffix, presentKeySet, hasContentMaxWidth],
    );

    return (
      <>
        {elements.map((props) => (
          <WriteableElement key={props.wrapperSlot} {...props} />
        ))}
      </>
    );
  },
);
