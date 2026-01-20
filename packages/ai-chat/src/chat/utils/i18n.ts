/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import IntlMessageFormat from "intl-messageformat";

/**
 * Generic message dictionary type for flexibility in testing and custom implementations.
 * This is compatible with LanguagePack from PublicConfig.
 */
export type MessageDictionary = Record<string, string>;

/**
 * Interface for the custom i18n formatter that replaces react-intl's IntlShape.
 * This is framework-agnostic and can be used with React, web components, or vanilla JS.
 */
export interface IntlShape {
  /**
   * The current locale (e.g., "en", "es", "fr")
   */
  locale: string;

  /**
   * The messages dictionary containing all translated strings
   */
  messages: MessageDictionary;

  /**
   * Format a message by its ID with optional variable substitution.
   * Supports ICU MessageFormat patterns including plurals, numbers, and variables.
   *
   * @param options - Object containing the message ID
   * @param options.id - The message key from the messages dictionary
   * @param values - Optional values for variable substitution
   * @returns The formatted message string
   *
   * @example
   * ```typescript
   * // Simple message
   * formatMessage({ id: 'input_placeholder' }) // "Type something..."
   *
   * // With variables
   * formatMessage({ id: 'messages_assistantSaid' }, { assistantName: 'Watson' }) // "Watson said"
   *
   * // With plurals
   * formatMessage({ id: 'agent_connectingMinutes' }, { time: 5 }) // "Current wait time is 5 minutes."
   * ```
   */
  formatMessage(options: { id: string }, values?: Record<string, any>): string;

  /**
   * Format a date according to the current locale.
   *
   * @param date - The date to format
   * @param options - Intl.DateTimeFormat options
   * @returns The formatted date string
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string;

  /**
   * Format a number according to the current locale.
   *
   * @param num - The number to format
   * @param options - Intl.NumberFormat options
   * @returns The formatted number string
   */
  formatNumber(num: number, options?: Intl.NumberFormatOptions): string;

  /**
   * Format a time according to the current locale.
   *
   * @param date - The date/time to format
   * @param options - Intl.DateTimeFormat options
   * @returns The formatted time string
   */
  formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string;
}

/**
 * Create a new i18n formatter instance.
 * This function replaces react-intl's createIntl().
 *
 * @param config - Configuration object
 * @param config.locale - The locale code (e.g., "en", "es")
 * @param config.messages - The messages dictionary containing translated strings
 * @returns A new IntlShape instance
 *
 * @example
 * ```typescript
 * import enMessages from '../languages/en.json';
 * const formatter = createIntl({ locale: 'en', messages: enMessages });
 * const greeting = formatter.formatMessage({ id: 'launcher_desktopGreeting' });
 * ```
 */
export function createIntl({
  locale,
  messages,
}: {
  locale: string;
  messages: MessageDictionary;
}): IntlShape {
  // Cache IntlMessageFormat instances for performance
  // This prevents re-parsing the same message pattern multiple times
  const formatters = new Map<string, IntlMessageFormat>();

  return {
    locale,
    messages,

    formatMessage(
      options: { id: string },
      values?: Record<string, any>,
    ): string {
      const { id } = options;
      const message = messages[id];

      // Handle missing translations gracefully
      if (!message) {
        console.warn(`[i18n] Missing translation for key: "${id}"`);
        return id; // Return the key as fallback
      }

      // For simple strings without variables, return directly
      if (!values && !message.includes("{")) {
        return message;
      }

      try {
        // Get or create cached formatter for this message
        if (!formatters.has(id)) {
          formatters.set(id, new IntlMessageFormat(message, locale));
        }

        const formatter = formatters.get(id)!;
        const result = formatter.format(values);

        // IntlMessageFormat can return string or array of parts
        // Convert to string if needed
        if (Array.isArray(result)) {
          return result.join("");
        }

        return result as string;
      } catch (error) {
        console.error(`[i18n] Error formatting message "${id}":`, error, {
          message,
          values,
        });
        // Return the raw message as fallback
        return message;
      }
    },

    formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
      try {
        return new Intl.DateTimeFormat(locale, options).format(date);
      } catch (error) {
        console.error("[i18n] Error formatting date:", error);
        return date.toLocaleDateString();
      }
    },

    formatNumber(num: number, options?: Intl.NumberFormatOptions): string {
      try {
        return new Intl.NumberFormat(locale, options).format(num);
      } catch (error) {
        console.error("[i18n] Error formatting number:", error);
        return num.toString();
      }
    },

    formatTime(date: Date, options?: Intl.DateTimeFormatOptions): string {
      try {
        const timeOptions: Intl.DateTimeFormatOptions = {
          hour: "numeric",
          minute: "numeric",
          ...options,
        };
        return new Intl.DateTimeFormat(locale, timeOptions).format(date);
      } catch (error) {
        console.error("[i18n] Error formatting time:", error);
        return date.toLocaleTimeString();
      }
    },
  };
}

/**
 * Helper function to check if a formatter is valid.
 * Useful for validation and error handling.
 */
export function isValidFormatter(formatter: any): formatter is IntlShape {
  return (
    formatter &&
    typeof formatter === "object" &&
    typeof formatter.formatMessage === "function" &&
    typeof formatter.locale === "string" &&
    typeof formatter.messages === "object"
  );
}

// Made with Bob
