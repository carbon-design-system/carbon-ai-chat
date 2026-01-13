/**
 * Copyright IBM Corp. 2025
 *
 * This source code is licensed under the Apache-2.0 license found in the
 * LICENSE file in the root directory of this source tree.
 */

/*
 *  Copyright IBM Corp. 2025
 *
 *  This source code is licensed under the Apache-2.0 license found in the
 *  LICENSE file in the root directory of this source tree.
 *
 *  @license
 */
/**
 * Status of the chain of thought step.
 *
 * @category Messaging
 */
var ChainOfThoughtStepStatus;
(function (ChainOfThoughtStepStatus) {
    /**
     * If the tool call is currently processing.
     */
    ChainOfThoughtStepStatus["PROCESSING"] = "processing";
    /**
     * If the tool call failed.
     */
    ChainOfThoughtStepStatus["FAILURE"] = "failure";
    /**
     * If the tool call succeeded.
     */
    ChainOfThoughtStepStatus["SUCCESS"] = "success";
})(ChainOfThoughtStepStatus || (ChainOfThoughtStepStatus = {}));

export { ChainOfThoughtStepStatus };
//# sourceMappingURL=defs.js.map
