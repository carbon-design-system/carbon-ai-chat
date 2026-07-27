/**
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import carbonConfig from 'prettier-config-carbon';

export default {
  ...carbonConfig,
  /* Disable automatic line wrapping in markdown files, 
  this was important for JSDoc links to not break into two lines leading
   to errors in linking docs across pages*/
  proseWrap: 'never',
};
