/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import { resolve } from 'node:path';

export default {
  build: {
    rollupOptions: {
      input: {
        normal: resolve('normal.html'),
        custom: resolve('custom.html'),
      },
    },
  },
};
