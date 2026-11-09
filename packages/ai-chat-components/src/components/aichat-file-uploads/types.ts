/**
 * @license
 *
 * Copyright IBM Corp. 2026
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * A file attached to a message that has already been sent.
 *
 * The counterpart to {@link FileUpload}, which describes a file staged in the input
 * area and carries the live `File` plus its upload status. The two differ in
 * fidelity: an upload always has the `File` and derives its name and type from it,
 * while an attachment states them outright and may have no `File` at all — a message
 * restored from conversation history cannot have one, since a `File` does not
 * serialize.
 *
 * `file` and `url` are the two ways a chip can show a media preview instead of a
 * file-type icon, and both are optional because neither always survives.
 */
export interface FileAttachment {
  /** A unique ID for the attachment. Not rendered; used to key a list of chips. */
  id: string;

  /** The file name to display. When absent the chip renders its fallback label. */
  name?: string;

  /** The MIME type, used to pick the file-type icon and to gate media previews. */
  mimeType?: string;

  /**
   * The live `File`, when the attachment still has one. Backs the image and video
   * previews. Absent for anything restored from history.
   */
  file?: File;

  /**
   * A URL the file can be read back from, when one is known. Used as an image
   * preview source where there is no `File`; never rendered as a link.
   */
  url?: string;
}
