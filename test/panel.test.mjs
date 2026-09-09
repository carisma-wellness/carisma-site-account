import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPanelModel, accountPanelHTML } from "../dist/index.js";

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
      // a Medical row that must NEVER reach a salon panel (W-15 belt-and-braces)
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
  assert.match(model.visits[0].manageHref, /^\/api\/auth\/start\?next=/);
  assert.equal(model.state, "settled");
  // hub links go through the door so the person arrives signed in
  assert.equal(model.hub.appointments, "/api/auth/start?next=%2Fusers%2Fappointments");
});

test("accountPanelHTML masks personal strings and never prints a Medical brand", () => {
  const html = accountPanelHTML(buildPanelModel(session));
  assert.match(html, /data-clarity-mask="True"/);
  assert.match(html, /Carisma Spa/);
  assert.match(html, /Manage/);
  assert.doesNotMatch(html, /Carisma Medical/);
  assert.doesNotMatch(html, /Consultation/);
});

test("an empty upcoming list renders the empty state, not an error", () => {
  const model = buildPanelModel({ signedIn: true, initials: "AB", profile: { firstName: "A", lastName: "B" }, upcoming: [] });
  assert.equal(model.state, "empty");
  assert.equal(model.visits.length, 0);
  const html = accountPanelHTML(model);
  assert.match(html, /no upcoming visits/i);
});

test("name falls back to the email local part when both names are empty", () => {
  const model = buildPanelModel({ signedIn: true, profile: { emailMasked: "j***@gmail.com" }, upcoming: [] });
  assert.equal(model.name, "j***");
});
