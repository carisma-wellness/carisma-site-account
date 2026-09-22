import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildPanelModel,
  accountPanelHTML,
  extractAppointmentList,
  accountPortalHTML,
  buildPortalModel,
} from "../dist/index.js";

const session = {
  signedIn: true,
  initials: "JD",
  profile: { firstName: "Jane", lastName: "Doe", emailMasked: "j***@gmail.com" },
  upcoming: [
    {
      id: "appt-1",
      brand: { slug: "carisma-spa", name: "Carisma Spa" },
      service: { name: "Hammam Ritual" },
      location: { name: "Sliema" },
      startTime: "Sat 20 Sep 16:00",
    },
    {
      id: "appt-med",
      brand: { slug: "carisma-medical", name: "Carisma Medical" },
      service: { name: "Consultation" },
      location: { name: "Online" },
      startTime: "Mon 22 Sep 09:00",
    },
  ],
};

test("buildPanelModel excludes any Medical row and keeps this brand's visit", () => {
  const model = buildPanelModel(session);
  assert.equal(model.name, "Jane Doe");
  assert.equal(model.emailMasked, "j***@gmail.com");
  assert.equal(model.initials, "JD");
  assert.equal(model.visits.length, 1);
  assert.equal(model.visits[0].brand, "Carisma Spa");
  assert.equal(model.visits[0].service, "Hammam Ritual");
  assert.equal(model.visits[0].venue, "Sliema");
  assert.equal(model.visits[0].manageHref, "/account/bookings");
  assert.equal(model.state, "settled");
  assert.equal(model.hub.home, "/account");
  assert.equal(model.hub.appointments, "/account/bookings");
  assert.equal(model.hub.details, "/account/details");
});

test("the live appointment card DTO (brandName / primaryServiceName) is read", () => {
  const model = buildPanelModel({
    signedIn: true,
    initials: "MG",
    profile: { firstName: "Mert", lastName: "Gulen", emailMasked: "m***@gmail.com" },
    upcoming: [
      {
        id: "card-1",
        brandName: "Carisma Spa",
        primaryServiceName: "Hammam Ritual",
        locationName: "InterContinental",
        startTime: "2026-09-20T14:00:00.000Z",
      },
    ],
  });
  assert.equal(model.visits[0].brand, "Carisma Spa");
  assert.equal(model.visits[0].service, "Hammam Ritual");
  assert.equal(model.visits[0].venue, "InterContinental");
  assert.match(model.visits[0].when, /Sep/);
});

test("brandName Medical is refused the same way as a nested slug", () => {
  const model = buildPanelModel({
    upcoming: [{ id: "m", brandName: "Carisma Medical", primaryServiceName: "Consult", startTime: "x" }],
  });
  assert.equal(model.visits.length, 0);
});

test("accountPanelHTML masks personal strings, offers sign-out, never prints a Medical brand", () => {
  const html = accountPanelHTML(buildPanelModel(session));
  assert.match(html, /data-clarity-mask="True"/);
  assert.match(html, /Carisma Spa/);
  assert.match(html, /My account/);
  assert.match(html, /data-carisma-signout/);
  assert.match(html, /data-carisma-signout-all/);
  assert.match(html, /account-panel-20260917/);
  assert.doesNotMatch(html, /Carisma Medical/);
  assert.doesNotMatch(html, /Consultation/);
  assert.doesNotMatch(html, /\/users\//);
});

test("an empty upcoming list renders the empty state, not an error", () => {
  const model = buildPanelModel({ signedIn: true, initials: "AB", profile: { firstName: "A", lastName: "B" }, upcoming: [] });
  assert.equal(model.state, "empty");
  assert.equal(model.visits.length, 0);
  const html = accountPanelHTML(model);
  assert.match(html, /no upcoming visits/i);
  assert.match(html, /href="\/"/);
});

test("name falls back to the email local part when both names are empty", () => {
  const model = buildPanelModel({ signedIn: true, profile: { emailMasked: "j***@gmail.com" }, upcoming: [] });
  assert.equal(model.name, "j***");
});

test("extractAppointmentList unwraps the house envelope and filter=upcoming {data:[]}", () => {
  assert.deepEqual(extractAppointmentList([{ id: "a" }]).map((r) => r.id), ["a"]);
  assert.deepEqual(
    extractAppointmentList({ success: true, data: { data: [{ id: "b" }], total: 1 } }).map((r) => r.id),
    ["b"],
  );
  assert.deepEqual(
    extractAppointmentList({ upcoming: { data: [{ id: "c" }] } }).map((r) => r.id),
    ["c"],
  );
});

test("the /account portal home is a signed-in page with sign-out, not the HOD /users hub", () => {
  const html = accountPortalHTML(buildPortalModel(session, "home"));
  assert.match(html, /account-portal-20260917/);
  // The greeting runs on the Malta clock and uses the first name only.
  assert.match(html, /Good (morning|afternoon|evening), Jane/);
  assert.match(html, /data-carisma-signout/);
  assert.match(html, /href="\/account\/bookings"/);
  assert.doesNotMatch(html, /\/users\//);
});
