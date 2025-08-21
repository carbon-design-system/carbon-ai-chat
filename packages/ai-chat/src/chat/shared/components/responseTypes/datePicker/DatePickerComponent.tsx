/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import Checkmark from "@carbon/icons-react/es/Checkmark.js";
import { Button, DatePicker, DatePickerInput } from "@carbon/react";
import dayjs from "dayjs";
import { BaseOptions } from "flatpickr/dist/types/options";
import React, { useCallback, useRef, useState } from "react";
import { useIntl } from "react-intl";
import { useSelector } from "react-redux";

import { ScrollElementIntoViewFunction } from "../../../containers/MessagesComponent";
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
    (state: AppState) => state.allMessagesByID[localMessage.fullMessageID],
  ) as MessageResponse;
  const uuidRef = useRef(uuid(UUIDType.MISCELLANEOUS));
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [userDisplayValue, setUserDisplayValue] = useState<string>();
  const [flatpickrFormat, setFlatpickrFormat] = useState<string>();
  const [userDisplayFormat, setUserDisplayFormat] = useState<string>();
  const [flatpickrLocale, setFlatpickrLocale] =
    useState<BaseOptions["locale"]>();
  const [dayjsLocale, setDayjsLocale] = useState<string>();
  const [datePickerHostElement, setDatePickerHostElement] =
    useState<HTMLDivElement>();
  const valueForAssistantRef = useRef<string>();
  // This ref is to track when the user uses the date picker input through some pointer that's not a keyboard
  // (e.g. mouse, touch, etc.) to open the date picker. If the date picker is opened and the user's pointer is not
  // over the date picker input, such as when the date picker is scrolled into view, the date picker will close.
  // This is intentional behavior from the DatePicker component, so a way around this will be to scroll the calendar
  // into view after the user has lifted their pointer from the input and not when the calendar is opened.
  const isInputPointerDownEventFiredRef = useRef<boolean>(false);
  const inputLabel = intl.formatMessage(
    { id: "datePicker_chooseDate" },
    { format: userDisplayFormat },
  );
  const confirmButtonLabel = intl.formatMessage({
    id: "datePicker_confirmDate",
  });
  const isDateInfoReady = Boolean(
    flatpickrFormat && userDisplayFormat && flatpickrLocale && dayjsLocale,
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
      responseID,
    );

    serviceManager.actions.sendWithCatch(
      request,
      MessageSendSource.DATE_PICKER,
      {
        setValueSelectedForMessageID: localMessageID,
      },
    );
  }, [localMessage, serviceManager, userDisplayValue]);

  /**
   * Scrolls the date picker host element into view.
   */
  const doScrollElementIntoView = useCallback(() => {
    scrollElementIntoView(datePickerHostElement, 0, 24);
  }, [datePickerHostElement, scrollElementIntoView]);

  useOnMount(() => {
    const localeFromMessage = webChatLocale;
    const { originalUserText } = localMessage.ui_state;
    const fromHistory = originalMessage.ui_state_internal?.from_history;

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
        `Locale ${dayjsLocale} is not recognized by Carbon AI Chat. Defaulting to English(US).`,
      );
      setDateInfoForLocale("en");
    }
  });

  return (
    <div className="WACDatePicker">
      {isDateInfoReady && datePickerHostElement && (
        <DatePicker
          className="WACDatePicker__Calendar"
          datePickerType="single"
          allowInput={false}
          locale={flatpickrLocale}
          appendTo={datePickerHostElement}
          onChange={(dates) => {
            if (dates.length) {
              const date = dates[0];

              // The assistant should receive the date value in ISO format.
              valueForAssistantRef.current = toAssistantDateFormat(date);
              // Use the date object to get a date string in the expected format.
              setUserDisplayValue(toUserDateFormat(date, userDisplayFormat));
            }
          }}
          dateFormat={flatpickrFormat}
          onOpen={() => {
            setIsCalendarOpen(true);
            // The carbon date picker uses a "handleClickOutside" functionality to detect when the user has clicked
            // outside of the component so that it will auto-close the calendar popup. There is a bug that occurs
            // when the component scrolls at the same time the popup opens. If the user clicks on the picker input
            // field, the mouse down part causes the field to get focus which causes the popup to open. We had code
            // below that would then cause the chat to scroll which moved the input field so it was no longer under
            // the mouse cursor. Unless the user does this very fast, the mouse up half of the click will not occur
            // on the input field (because it moved) and the component detects this as a "click outside" and closes
            // the popup. The popup can open either because the user clicks on the input field or when the field gets
            // focus from keyboard input. With keyboard input, we want continue to scroll when the popup opens.
            // However, if the user clicks on the input, we want to delay the scroll until the click is fully
            // processed (this will ensure the cursor stays on the input field until the mouse up occurs).
            if (isInputPointerDownEventFiredRef.current) {
              isInputPointerDownEventFiredRef.current = false;
            } else {
              doScrollElementIntoView();
            }
          }}
          onClose={() => setIsCalendarOpen(false)}
        >
          <DatePickerInput
            id={uuidRef.current}
            labelText={inputLabel}
            placeholder={userDisplayFormat}
            disabled={disabled}
            // Set this prop value to an empty string. The component will set a default text telling the user to match
            // the requests date format, which is useless since we don't allow the user to type a date.
            title=""
            // This event listener is fired before the DatePicker component's onOpen listener so we'll set the flag
            // to prevent the onOpen listener from moving the input away from the user's pointer and close the
            // calendar as result.
            onPointerDown={() => {
              isInputPointerDownEventFiredRef.current = true;
            }}
            // This event listener gets fired once the user's pointer is lifted from the input which is when we
            // scroll the calendar into view.
            onClick={() => doScrollElementIntoView()}
          />
        </DatePicker>
      )}
      <div
        className="WACDatePicker__CalendarContainer"
        ref={setDatePickerHostElement}
      />
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
