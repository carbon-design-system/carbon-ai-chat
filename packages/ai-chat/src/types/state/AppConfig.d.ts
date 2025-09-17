/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { PublicConfig } from "../config/PublicConfig";

/**
 * This contains the top level interface that defines the configuration options for the application. This is simply
 * a merge of the config data that is provided by the host page and the remote server.
 */

interface AppConfig {
  /**
   * The original set of public configuration data provided by the user.
   */
  public: PublicConfig;
}

export { AppConfig };
