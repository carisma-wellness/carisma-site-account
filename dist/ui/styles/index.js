/** The portal stylesheet, in cascade order. chromeCss.ts adds the panel. */
import { PORTAL_TOKENS_CSS, PORTAL_BASE_CSS } from "./base.js";
import { PORTAL_SHELL_CSS } from "./shell.js";
import { PORTAL_LISTS_CSS } from "./lists.js";
import { PORTAL_BOOKING_CSS } from "./booking.js";
import { PORTAL_RECORDS_CSS } from "./records.js";
import { PORTAL_CIRCLE_CSS, PANEL_CIRCLE_CSS } from "./circle.js";
export { PORTAL_TOKENS_CSS, PORTAL_BASE_CSS, PORTAL_SHELL_CSS, PORTAL_LISTS_CSS, PORTAL_BOOKING_CSS, PORTAL_RECORDS_CSS, PORTAL_CIRCLE_CSS, PANEL_CIRCLE_CSS };
/** Every portal rule, WITHOUT the :root token fallbacks (what the no-hex test reads). */
export const PORTAL_RULES_CSS = [PORTAL_BASE_CSS, PORTAL_SHELL_CSS, PORTAL_LISTS_CSS, PORTAL_BOOKING_CSS, PORTAL_RECORDS_CSS, PORTAL_CIRCLE_CSS].join("\n");
//# sourceMappingURL=index.js.map