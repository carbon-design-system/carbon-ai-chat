/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Utility type that makes all properties in T optional recursively.
 *
 * This type is useful for configuration objects where you want to allow
 * partial updates to nested object structures. It recursively applies
 * the optional modifier (?) to all properties, including nested objects.
 *
 * @template T - The type to make deeply partial
 *
 * @example
 * ```typescript
 * interface Config {
 *   server: {
 *     host: string;
 *     port: number;
 *   };
 *   database: {
 *     url: string;
 *     timeout: number;
 *   };
 * }
 *
 * // All properties become optional, including nested ones
 * const partialConfig: DeepPartial<Config> = {
 *   server: {
 *     host: "localhost" // port is optional
 *   }
 *   // database is optional entirely
 * };
 * ```
 *
 * @category Utilities
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
