/*
 *  Copyright IBM Corp. 2026
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */

import { shallowEqual } from '../store/appStore';
import { selectInputConfig } from '../utils/inputConfig';
import { useSelector } from './useSelector';

export function useInputConfig() {
  return useSelector(selectInputConfig, shallowEqual);
}
