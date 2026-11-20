/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { WriteableElementName } from '../../types/instance/WriteableElements';

export interface ShellWriteableElementsOptions {
  suffix: string;
  showHomeScreen: boolean;
  writeableElementsPresentKeys?: string;
  inputIsVisible: boolean;
  hasContentMaxWidth: boolean;
  headerIsOn: boolean;
}

export interface ShellWriteableElementMetadata {
  wrapperSlot: string;
  slotName: WriteableElementName;
  id: string;
  className: string;
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
  return typeof value === 'function'
    ? (value as (flag: boolean) => T)(flag)
    : value;
}

/**
 * Configuration array for all writeable elements in the app shell.
 */
const ELEMENT_CONFIGS: ElementConfig[] = [
  {
    wrapperSlot: 'input',
    slotName: WriteableElementName.CUSTOM_PROMPT_LINE,
    idSuffix: 'customPromptLineElement',
    className: 'cds-aichat--custom-prompt-line-element',
  },
  {
    wrapperSlot: 'header',
    slotName: WriteableElementName.CUSTOM_HEADER,
    idSuffix: 'customHeaderElement',
    className: 'cds-aichat--custom-header-element',
  },
  {
    wrapperSlot: 'header-after',
    slotName: (show) =>
      show
        ? WriteableElementName.HOME_SCREEN_HEADER_BOTTOM_ELEMENT
        : WriteableElementName.HEADER_BOTTOM_ELEMENT,
    idSuffix: (show) =>
      show ? 'homeScreenHeaderBottomElement' : 'headerBottomElement',
    className: (show) =>
      show
        ? 'cds-aichat--home-screen__home-screen-bottom-element'
        : 'cds-aichat--header-bottom-element',
  },
  {
    wrapperSlot: 'input-before',
    slotName: (show) =>
      show
        ? WriteableElementName.HOME_SCREEN_BEFORE_INPUT_ELEMENT
        : WriteableElementName.BEFORE_INPUT_ELEMENT,
    idSuffix: (show) =>
      show ? 'homeScreenBeforeInputElement' : 'beforeInputElement',
    className: (show) =>
      show
        ? 'cds-aichat--home-screen-before-input-element'
        : 'cds-aichat--before-input-element',
  },
  {
    wrapperSlot: 'input-after',
    slotName: WriteableElementName.AFTER_INPUT_ELEMENT,
    idSuffix: 'afterInputElement',
    className: 'cds-aichat--after-input-element',
  },
  {
    wrapperSlot: 'footer',
    slotName: WriteableElementName.FOOTER_ELEMENT,
    idSuffix: 'footerElement',
    className: 'cds-aichat--footer-element',
  },
];

export function getShellWriteableElements({
  suffix,
  showHomeScreen,
  writeableElementsPresentKeys,
  inputIsVisible,
  hasContentMaxWidth,
  headerIsOn,
}: ShellWriteableElementsOptions): ShellWriteableElementMetadata[] {
  const presentKeySet =
    writeableElementsPresentKeys === undefined
      ? null
      : new Set(
          writeableElementsPresentKeys
            ? writeableElementsPresentKeys.split(' ')
            : []
        );

  return ELEMENT_CONFIGS.map((config) => {
    const baseClassName = resolveValue(config.className, showHomeScreen);
    const isHeaderBottomElement =
      baseClassName === 'cds-aichat--header-bottom-element';
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
    if (element.slotName === WriteableElementName.CUSTOM_PROMPT_LINE) {
      return inputIsVisible;
    }
    if (
      element.slotName === WriteableElementName.CUSTOM_HEADER &&
      !headerIsOn
    ) {
      return false;
    }
    if (presentKeySet === null) {
      return true;
    }
    return presentKeySet.has(element.slotName);
  });
}
