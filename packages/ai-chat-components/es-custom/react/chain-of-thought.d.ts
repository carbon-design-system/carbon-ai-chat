import React from "react";
import CDSAIChatChainOfThought from "../components/chain-of-thought/src/chain-of-thought.js";
import { type ChainOfThoughtOnToggle, ChainOfThoughtStepStatus, type ChainOfThoughtStepToggleEventDetail, type ChainOfThoughtToggleEventDetail } from "../components/chain-of-thought/defs.js";
declare const ChainOfThought: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CDSAIChatChainOfThought>>;
export type { ChainOfThoughtOnToggle, ChainOfThoughtStepToggleEventDetail, ChainOfThoughtToggleEventDetail, };
export { ChainOfThoughtStepStatus };
export default ChainOfThought;
