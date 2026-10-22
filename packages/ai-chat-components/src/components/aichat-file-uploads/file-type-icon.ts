/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

import DocumentPDF20 from '@carbon/icons/es/PDF/20.js';
import DocumentTXT20 from '@carbon/icons/es/TXT/20.js';
import DocumentXLS20 from '@carbon/icons/es/XLS/20.js';
import DocumentZIP20 from '@carbon/icons/es/ZIP/20.js';
import DocumentPPT20 from '@carbon/icons/es/PPT/20.js';
import DocumentCSV20 from '@carbon/icons/es/CSV/20.js';
import DocumentDOC20 from '@carbon/icons/es/DOC/20.js';
import DocumentHTML20 from '@carbon/icons/es/HTML/20.js';
import DocumentJSON20 from '@carbon/icons/es/JSON/20.js';

interface FileTypeIcon {
  icon: typeof DocumentPDF20;
  mimes: string[];
  extensions: string[];
}

/**
 * The file types the chip has an icon for.
 *
 * Order matters: the first entry matching either the MIME type or the extension
 * wins, so a file whose two disagree resolves to whichever appears first here.
 */
const FILE_TYPE_ICONS: FileTypeIcon[] = [
  { icon: DocumentPDF20, mimes: ['application/pdf'], extensions: ['pdf'] },
  { icon: DocumentTXT20, mimes: ['text/plain'], extensions: ['txt'] },
  {
    icon: DocumentXLS20,
    mimes: [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ],
    extensions: ['xls', 'xlsx'],
  },
  {
    icon: DocumentZIP20,
    mimes: ['application/zip', 'application/x-zip-compressed'],
    extensions: ['zip'],
  },
  {
    icon: DocumentPPT20,
    mimes: [
      'application/vnd.ms-powerpoint',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    ],
    extensions: ['ppt', 'pptx'],
  },
  { icon: DocumentCSV20, mimes: ['text/csv'], extensions: ['csv'] },
  {
    icon: DocumentDOC20,
    mimes: [
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ],
    extensions: ['doc', 'docx'],
  },
  {
    icon: DocumentHTML20,
    mimes: ['text/html'],
    extensions: ['html', 'htm'],
  },
  { icon: DocumentJSON20, mimes: ['application/json'], extensions: ['json'] },
];

/**
 * Picks the file-type icon for a file from its name and MIME type, returning
 * `null` when neither matches a known type.
 *
 * Both arguments are optional so this also serves an attachment restored from
 * conversation history, where only one of the two may be known.
 */
function pickFileTypeIcon(
  name?: string,
  mimeType?: string
): typeof DocumentPDF20 | null {
  const extension = name?.split('.').pop()?.toLowerCase() ?? '';
  const mime = mimeType?.toLowerCase() ?? '';

  const match = FILE_TYPE_ICONS.find(
    (entry) =>
      entry.mimes.includes(mime) || entry.extensions.includes(extension)
  );

  return match?.icon ?? null;
}

export { pickFileTypeIcon };
