/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Checkmark from "@carbon/icons-react/es/Checkmark.js";
import {
  Button,
  // DatePicker as ReactDatePicker,
  // DatePickerInput as ReactDatePickerInput,
} from "@carbon/react";
import Layer from "../../../../react/carbon/Layer";
import {
  DatePickerInput,
  DatePicker,
} from "../../../../react/carbon/DatePicker";
import { DATE_PICKER_INPUT_KIND } from "@carbon/web-components/es/components/date-picker/defs.js";
import dayjs from "dayjs";
import { BaseOptions } from "flatpickr/dist/types/options";
import React, { useCallback, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import { ScrollElementIntoViewFunction } from "../../../containers/MessagesComponent";
import { doScrollElementIntoView } from "../../../utils/domUtils";
import { useOnMount } from "../../../hooks/useOnMount";
import { useServiceManager } from "../../../hooks/useServiceManager";
import { AppState } from "../../../../../types/state/AppState";
import { LocalMessageItem } from "../../../../../types/messaging/LocalMessageItem";

import { ENGLISH_US_DATE_FORMAT } from "../../../utils/constants";
import {
  sanitizeDateFormat,
  toAssistantDateFormat,
  toUserDateFormat,
} from "../../../utils/dateUtils";
import { uuid, UUIDType } from "../../../utils/lang/uuid";
import { loadDayjsLocale } from "../../../utils/languages";
import { createMessageRequestForDate } from "../../../utils/messageUtils";
import { consoleError } from "../../../utils/miscUtils";
import {
  DateItem,
  MessageResponse,
} from "../../../../../types/messaging/Messages";
import { MessageSendSource } from "../../../../../types/events/eventBusTypes";

interface DatePickerComponentProps {
  /**
   * The message to display.
   */
  localMessage: LocalMessageItem<DateItem>;

  /**
   * Indicates if the input should be disabled.
   */
  disabled: boolean;

  /**
   * This is used to scroll the date picker into view.
   */
  scrollElementIntoView: ScrollElementIntoViewFunction;
}

/**
 * This component handles rendering a carbon date picker for the date response type. It handles sending the selected
 * date value as the standard ISO date format and ensuring the message request displays the user's input selection.
 */
function DatePickerComponent(props: DatePickerComponentProps) {
  const { localMessage, disabled, scrollElementIntoView } = props;
  const serviceManager = useServiceManager();
  const intl = useIntl();
  const webChatLocale = useSelector((state: AppState) => state.locale);
  const originalMessage = useSelector(
    (state: AppState) => state.allMessagesByID[localMessage.fullMessageID]
  ) as MessageResponse;
  const uuidRef = useRef(uuid(UUIDType.MISCELLANEOUS));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [userDisplayValue, setUserDisplayValue] = useState<string>();
  const [flatpickrFormat, setFlatpickrFormat] = useState<string>();
  const [userDisplayFormat, setUserDisplayFormat] = useState<string>();
  const [flatpickrLocale, setFlatpickrLocale] =
    useState<BaseOptions["locale"]>();
  const [dayjsLocale, setDayjsLocale] = useState<string>();
  const datePickerRef = useRef<any>(null);
  const valueForAssistantRef = useRef<string>();
  const inputLabel = intl.formatMessage(
    { id: "datePicker_chooseDate" },
    { format: userDisplayFormat }
  );
  const confirmButtonLabel = intl.formatMessage({
    id: "datePicker_confirmDate",
  });
  const isDateInfoReady = Boolean(
    flatpickrFormat && userDisplayFormat && flatpickrLocale && dayjsLocale
  );

  /**
   * Handles setting the necessary date info that will handle formatting the user's selected date value using the
   * provided locale.
   */
  function setDateInfoForLocale(locale: string) {
    // Get the date format for the given locale from dayjs, or default to the mm/dd/yyyy.
    const format =
      dayjs.Ls[locale]?.formats?.L?.toLocaleLowerCase() ||
      ENGLISH_US_DATE_FORMAT;
    const dateFormat = sanitizeDateFormat(format);

    setDayjsLocale(locale);
    setFlatpickrLocale(calcFlatpickrLocale(locale));
    setUserDisplayFormat(dateFormat);
    setFlatpickrFormat(getFlatpickrDateFormat(dateFormat));
  }

  /**
   * When the user confirms their date selection we should send that date info to the assistant.
   */
  const handlerSendDate = useCallback(() => {
    const { ui_state, fullMessageID: responseID } = localMessage;
    const localMessageID = ui_state.id;
    const request = createMessageRequestForDate(
      valueForAssistantRef.current,
      userDisplayValue,
      responseID
    );

    serviceManager.actions.sendWithCatch(
      request,
      MessageSendSource.DATE_PICKER,
      {
        setValueSelectedForMessageID: localMessageID,
      }
    );
  }, [localMessage, serviceManager, userDisplayValue]);

  const handleOpen = useCallback(() => {
    setIsCalendarOpen(true);

    const element = datePickerRef.current?.renderRoot?.querySelector(
      "#floating-menu-container div.cds-custom--date-picker__calendar"
    );

    if (element) {
      const onAnimationEnd = () => {
        doScrollElementIntoView(element, true);
        element.removeEventListener("transitionend", onAnimationEnd);
        element.removeEventListener("animationend", onAnimationEnd);
      };

      element.addEventListener("transitionend", onAnimationEnd);
      element.addEventListener("animationend", onAnimationEnd);
    }
  }, []);

  useOnMount(() => {
    const localeFromMessage = webChatLocale;
    const { originalUserText } = localMessage.ui_state;
    const fromHistory = originalMessage.history.from_history;

    // If this message is from history and a user has made a previous selection, set the value in the input.
    if (fromHistory && originalUserText) {
      setUserDisplayValue(originalUserText);
    }

    try {
      // Load the date formats for the given locale if it was previously loaded.
      if (dayjs.Ls[localeFromMessage]) {
        setDateInfoForLocale(localeFromMessage);
      } else {
        loadDayjsLocale(localeFromMessage).then((locale) => {
          setDateInfoForLocale(locale);
        });
      }
    } catch {
      consoleError(
        `Locale ${dayjsLocale} is not recognized by Carbon AI chat. Defaulting to English(US).`
      );
      setDateInfoForLocale("en");
    }
  });

  return (
    <div className="WACDatePicker">
      {isDateInfoReady && (
        <Layer level={1}>
          <DatePicker
            ref={datePickerRef}
            allow-input="true"
            close-on-select="true"
            date-format={flatpickrFormat}
            onClick={handleOpen}
            onFocus={handleOpen}
            onChange={(e: CustomEvent) => {
              const dates = e.detail.selectedDates;
              if (dates.length) {
                const date = dates[0];
                // The assistant should receive the date value in ISO format.
                valueForAssistantRef.current = toAssistantDateFormat(date);
                // Use the date object to get a date string in the expected format.
                setUserDisplayValue(toUserDateFormat(date, userDisplayFormat));
                setIsCalendarOpen(false);
              }
            }}
          >
            <DatePickerInput
              id={uuidRef.current}
              disabled={disabled}
              kind={DATE_PICKER_INPUT_KIND.SINGLE}
              label-text={inputLabel}
              placeholder={userDisplayFormat}
              warn-text=""
            ></DatePickerInput>
          </DatePicker>
        </Layer>
      )}
      {!disabled && !isCalendarOpen && userDisplayValue && (
        <Button
          className="WACDatePicker__ConfirmButton"
          onClick={handlerSendDate}
          renderIcon={(props) => <Checkmark size={32} {...props} />}
        >
          {confirmButtonLabel}
        </Button>
      )}
    </div>
  );
}

/**
 * Returns an object of locales that are accepted as locale values for flatpickr library used in the carbon date picker
 * component and dayjs library.
 */
function calcFlatpickrLocale(localeValue: string) {
  // flatpickr does support the locale zh-tw, but it won't recognize it unless it has an underscore instead of a dash.
  if (localeValue === "zh-tw") {
    return "zh_tw";
  }

  // For the flatpickr library, if the value provided contains a region in the locale, only the language will be
  // returned since the library seems to mostly support locales without the region.
  //
  // flatpickr - https://github.com/flatpickr/flatpickr/tree/master/src/l10n
  return (
    localeValue.includes("-") ? localeValue.split("-")[0] : localeValue
  ) as BaseOptions["locale"];
}

/**
 * Returns a date format that would be valid for the flatpickr library used in the carbon date picker component.
 */
function getFlatpickrDateFormat(format: string) {
  const dash = format.includes("-") ? "-" : "/";
  const firstChar = format.toLocaleLowerCase().trim()[0];

  if (firstChar === "m") {
    return `m${dash}d${dash}Y`;
  }

  if (firstChar === "d") {
    return `d${dash}m${dash}Y`;
  }

  if (firstChar === "y") {
    return `Y${dash}m${dash}d`;
  }

  throw Error(`The provided format ${format} is invalid.`);
}

const DatePickerComponentExport = React.memo(DatePickerComponent);

export { DatePickerComponentExport as DatePickerComponent };
