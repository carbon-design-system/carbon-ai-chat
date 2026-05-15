/*
 *  Copyright IBM Corp. 2025, 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

/**
 * Upload options. Currently only applies to conversations with a human agent.
 *
 * @category Instance
 */
export interface FileUploadCapabilities {
  /**
   * Indicates that file uploads may be performed by the user.
   */
  allowFileUploads: boolean;

  /**
   * If file uploads are allowed, this indicates if more than one file may be selected at a time. The default is false.
   */
  allowMultipleFileUploads: boolean;

  /**
   * If file uploads are allowed, this is the set a file types that are allowed. This is filled into the "accept"
   * field for the file input element.
   */
  allowedFileUploadTypes: string;
}
