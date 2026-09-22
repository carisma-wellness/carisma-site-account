import { buildWalletModel, walletHTML, buildStatementModel, statementHTML, buildDocumentsModel, documentsHTML, buildMembershipModel, membershipHTML, } from "./records.js";
const PROXY = "/api/auth/proxy";
/** The proxy reads a section needs, in a fixed order `bodyFor` relies on. */
export function requestsFor(view) {
    switch (view) {
        case "wallet":
            return [`${PROXY}/client/gift-cards`, `${PROXY}/client/packages`, `${PROXY}/client/credit-balance`];
        case "payments":
            return [`${PROXY}/client/account/statement`];
        case "documents":
            return [`${PROXY}/client/account/documents`];
        case "membership":
            return [`${PROXY}/client/membership`];
        case "bookings":
            return [
                `${PROXY}/client/booking/appointments?filter=upcoming&limit=50`,
                `${PROXY}/client/booking/appointments?filter=past&limit=50`,
            ];
        default:
            return [];
    }
}
/** The page heading for a section. */
export function titleFor(view, greeting) {
    switch (view) {
        case "bookings":
            return "Your bookings";
        case "wallet":
            return "Your wallet";
        case "payments":
            return "Your payments";
        case "documents":
            return "Your documents";
        case "membership":
            return "Your membership";
        case "details":
            return "Your details";
        default:
            return greeting;
    }
}
/**
 * Render a section from the answers to `requestsFor(view)`, in order.
 *
 * A `null` answer means the read failed or was refused. Every builder treats
 * that as "nothing here", so one dead endpoint costs its own block and never
 * the page: a member whose gift-card read 500s still sees their packages and
 * their credit.
 */
export function bodyFor(view, answers) {
    switch (view) {
        case "wallet":
            return walletHTML(buildWalletModel({ giftCards: answers[0], packages: answers[1], credit: answers[2] }));
        case "payments":
            return statementHTML(buildStatementModel(answers[0]));
        case "documents":
            return documentsHTML(buildDocumentsModel(answers[0]));
        case "membership":
            return membershipHTML(buildMembershipModel(answers[0]));
        default:
            return "";
    }
}
/**
 * `/account/bookings/<id>` → the id. Anything else → null.
 *
 * Kept here rather than in the page files because five sites would otherwise
 * each write their own, and the one that got it wrong would render the
 * bookings LIST at a detail URL with no error anywhere.
 */
export function bookingIdFromPath(pathname) {
    const m = /^\/account\/bookings\/([^/?#]+)\/?$/.exec(pathname || "");
    if (!m)
        return null;
    try {
        const id = decodeURIComponent(m[1]);
        return id && id !== "counts" ? id : null;
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=portalData.js.map