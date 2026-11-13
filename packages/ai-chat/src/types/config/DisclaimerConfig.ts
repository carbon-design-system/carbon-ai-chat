/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Configuration for the disclaimer screen, consumed by {@link PublicConfig.disclaimer}.
 *
 * The disclaimer holds back only user input: the user can't chat until they accept it. The chat still sends the
 * welcome request to {@link PublicConfigMessaging.customSendMessage} while the disclaimer shows. If you need consent
 * first, check `disclaimersAccepted` in {@link ChatInstance.state} before you answer, or set
 * {@link PublicConfigMessaging.skipWelcome}.
 *
 * @category Config
 */
export interface DisclaimerPublicConfig {
  /**
   * If the disclaimer is turned on. Defaults to `false`.
   */
  isOn?: boolean;

  /**
   * HTML content to show in disclaimer.
   */
  disclaimerHTML: string;
}
