/**
 * Appointment-list unwrapping. The CarismaSoft house envelope is {success,data};
 * filter=upcoming is {data: AppointmentCard[]}; filter=all is
 * {upcoming:{data:[]}, past:{data:[]}}. The panel, the session route and the
 * /account portal all go through here so a shape change cannot silently empty
 * one surface and not the others.
 */
export declare function unwrapEnvelope(body: unknown): unknown;
/** Pull the appointment cards out of any of the three live reply shapes. */
export declare function extractAppointmentList(body: unknown): Array<Record<string, unknown>>;
export declare function extractAppointmentBucket(body: unknown, bucket: "upcoming" | "past" | "canceled"): Array<Record<string, unknown>>;
/** A row is Medical if its brand slug or name says so (W-15 belt-and-braces). */
export declare function isMedicalAppointment(row: Record<string, unknown>): boolean;
/** Europe/Malta, en-GB. An already-human string (the panel test fixture) is kept. */
export declare function formatWhen(raw: string): string;
//# sourceMappingURL=appointments.d.ts.map