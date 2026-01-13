import React from "react";
import CDSAIChatCard from "../components/card/src/card.js";
import CDSAIChatCardFooter from "../components/card/src/card-footer.js";
import CDSAIChatCardSteps from "../components/card/src/card-steps.js";
declare const Card: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CDSAIChatCard>>;
declare const CardFooter: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CDSAIChatCardFooter>>;
declare const CardSteps: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CDSAIChatCardSteps>>;
export { Card, CardFooter, CardSteps };
export default Card;
