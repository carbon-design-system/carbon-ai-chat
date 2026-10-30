/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

// A small SVG portrait, inlined so the stories need no network access.
export const profileImage = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
    '<rect width="64" height="64" fill="#0f62fe"/>' +
    '<circle cx="32" cy="24" r="12" fill="#ffffff"/>' +
    '<path d="M10 64c0-14 10-24 22-24s22 10 22 24z" fill="#ffffff"/>' +
    '</svg>'
)}`;
