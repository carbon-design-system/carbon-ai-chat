import "@carbon/web-components/es-custom/components/data-table/index.js";
import "@carbon/web-components/es-custom/components/checkbox/index.js";
import "@carbon/web-components/es-custom/components/button/index.js";
import "@carbon/web-components/es-custom/components/layer/index.js";
import type { CDSAIChatTable } from "./table.js";
/**
 * Table view logic.
 */
declare function tableTemplate(tableElement: CDSAIChatTable): import("lit-html").TemplateResult<1>;
export { tableTemplate };
