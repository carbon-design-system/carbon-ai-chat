/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

/**
 * `treatValidationWarningsAsErrors` is set in typedoc.json so that conditions
 * like a referenced-but-unexported type fail the build. A handful of validation
 * warnings are known-acceptable in this project (e.g. the demo path that points
 * outside the docs output). This plugin demotes those specific messages to plain
 * `warn` calls so they remain visible but don't count toward the validation
 * warning total that triggers the non-zero exit.
 *
 * Caveat: TypeDoc decides "this is a validation warning" by sampling
 * `warningCount` immediately after conversion and re-checking after
 * `app.validate(project)`. The currently-listed pattern is emitted during
 * the conversion phase, so the demoted `logger.warn` call is sampled into
 * the pre-validation count and does not bump the validation delta. Patterns
 * whose `validationWarning` actually fires inside `app.validate(project)`
 * (e.g. "found 1 unresolved symbol") will still bump `warningCount` after
 * being demoted, which still trips the failure path. If you add such a
 * pattern, demote it via `logger.diagnostic` (no count bump) or filter it
 * out before TypeDoc sees it.
 *
 * @type {import("typedoc").PluginHost}
 */
const ACCEPTABLE_PATTERNS = [
  /is not a file and will not be copied to the output directory/,
];

export function load(app) {
  const logger = app.logger;
  const originalValidationWarning = logger.validationWarning.bind(logger);
  logger.validationWarning = (text, ...args) => {
    if (ACCEPTABLE_PATTERNS.some((re) => re.test(String(text)))) {
      logger.warn(text, ...args);
      return;
    }
    originalValidationWarning(text, ...args);
  };
}
