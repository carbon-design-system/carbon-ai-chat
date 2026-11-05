/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { selectHasInFlightUpload } from '../../store/selectors';
import type { ConversationState } from '../../../types/state/AppState';

function assertNoInFlightUpload(state: ConversationState) {
  if (selectHasInFlightUpload(state)) {
    throw new Error(
      'Cannot send while a file upload is in progress. Check instance.getState().input.hasInFlightUploads before sending, or wait for the upload to finish.'
    );
  }
}

export { assertNoInFlightUpload };
