/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 */

import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: {
    port: Number(process.env.PORT) || 3000,
    open: true,
  },
  // exclude these packages from pre-bundle
  optimizeDeps: {
    exclude: ['@carbon/ai-chat', '@carbon/ai-chat-components'],
  },
});
