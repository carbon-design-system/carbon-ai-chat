import "../../markdown/index.js";
import "@carbon/web-components/es-custom/components/button/index.js";
import "@carbon/web-components/es-custom/components/chat-button/index.js";
import "@carbon/web-components/es-custom/components/icon-button/index.js";
import "@carbon/web-components/es-custom/components/layer/index.js";
import "@carbon/web-components/es-custom/components/textarea/index.js";
import { CDSAIChatFeedback } from "./feedback.js";
/**
 * Lit template for feedback.
 */
declare function feedbackElementTemplate(customElementClass: CDSAIChatFeedback): import("lit-html").TemplateResult<1>;
export { feedbackElementTemplate };
