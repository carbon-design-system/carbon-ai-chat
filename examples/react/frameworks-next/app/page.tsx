/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * App Router entry page for the Next.js example.
 *
 * Demonstrates: how to host `ChatContainer` inside a Next.js App Router route
 * by deferring the chat module to the client via `next/dynamic` with
 * `ssr: false`. This is the "one thing" of the example — the framework glue.
 *
 * APIs exercised:
 *   - `next/dynamic` (with `ssr: false`)
 *   - `"use client"` directive
 *
 * Start reading at: the `dynamic(...)` call below, then `src/ChatExample.tsx`.
 */

// `next/dynamic` with `ssr: false` is a client-only API, so this page must opt out of server rendering before importing it.
"use client";

import dynamic from "next/dynamic";
import React from "react";

// ChatContainer touches `window` and registers custom elements at module load, which crashes during Next.js server rendering. `ssr: false` defers the module to the browser bundle.
const ChatExample = dynamic(() => import("@/src/ChatExample"), {
  ssr: false,
  loading: () => <p>Loading chat experience…</p>,
});

export default function Home() {
  return (
    <main>
      <ChatExample />
    </main>
  );
}
