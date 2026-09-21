/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * Playwright setup for this example.
 *
 * The port is probed at config load rather than hardcoded. Every example falls
 * back to port 3000 when `PORT` is unset, so suites running concurrently would
 * collide; probing keeps them unique without a table anyone has to maintain.
 * Each example's suite is its own process tree, so the environment variable
 * below never leaks between examples running in parallel.
 */

import defineBaseConfig from '../../shared/playwright/baseConfig';

export default defineBaseConfig();
