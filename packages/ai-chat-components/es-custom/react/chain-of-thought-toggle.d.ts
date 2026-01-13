import React from "react";
import CDSAIChatChainOfThoughtToggle from "../components/chain-of-thought/src/chain-of-thought-toggle.js";
import { type ChainOfThoughtToggleEventDetail } from "../components/chain-of-thought/defs.js";
declare const ChainOfThoughtToggle: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CDSAIChatChainOfThoughtToggle>>;
export type { ChainOfThoughtToggleEventDetail };
export default ChainOfThoughtToggle;
