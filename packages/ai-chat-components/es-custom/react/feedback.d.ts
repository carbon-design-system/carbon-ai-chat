import React from "react";
import CDSAIChatFeedbackElement from "../components/feedback/src/feedback.js";
import { type FeedbackInitialValues, type FeedbackSubmitDetails } from "../components/feedback/src/feedback.js";
declare const Feedback: React.ForwardRefExoticComponent<Omit<Record<string, unknown>, "ref"> & React.RefAttributes<CDSAIChatFeedbackElement>>;
export type { FeedbackInitialValues, FeedbackSubmitDetails };
export default Feedback;
