import assert from "node:assert/strict";
import test from "node:test";
import { describeEmail } from "./emailActivity.service";
import type { EmailRecord } from "./emailActivity.repository";

function buildEmail(overrides: Partial<EmailRecord> = {}): EmailRecord {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    hubspotId: "112776434262",
    archived: false,
    hsEmailDirection: null,
    hsEmailSubject: null,
    hsBodyPreview: null,
    hsBodyPreviewHtml: null,
    hsEmailFromEmail: null,
    hsEmailFromFirstname: null,
    hsEmailFromLastname: null,
    hsEmailToEmail: null,
    hsEmailToFirstname: null,
    hsEmailToLastname: null,
    hsTimestamp: new Date("2026-01-01T00:00:00Z"),
    hsLastmodifieddate: new Date("2026-01-01T00:00:00Z"),
    createdAt: new Date("2026-01-01T00:00:00Z"),
    updatedAt: new Date("2026-01-01T00:00:00Z"),
    ...overrides,
  };
}

test("describeEmail labels an outgoing email as Sent", () => {
  const { description } = describeEmail(
    buildEmail({ hsEmailDirection: "EMAIL", hsEmailSubject: "Follow up", hsBodyPreviewHtml: "<p>Hi there</p>" }),
  );
  assert.match(description, /Sent — Follow up/);
  assert.match(description, /<p>Hi there<\/p>/);
});

test("describeEmail labels an incoming email as Received", () => {
  const { description } = describeEmail(
    buildEmail({ hsEmailDirection: "INCOMING_EMAIL", hsEmailSubject: "Re: Follow up" }),
  );
  assert.match(description, /Received — Re: Follow up/);
});

test("describeEmail falls back to a generic label for an unrecognized direction", () => {
  const { description } = describeEmail(buildEmail({ hsEmailDirection: "FORWARDED_EMAIL", hsEmailSubject: "Fwd" }));
  assert.match(description, /Email — Fwd/);
});

test("describeEmail falls back to a generic label when direction is null", () => {
  const { description } = describeEmail(buildEmail({ hsEmailDirection: null, hsEmailSubject: "No direction" }));
  assert.match(description, /Email — No direction/);
});

test("describeEmail falls back to a placeholder subject when missing", () => {
  const { description } = describeEmail(buildEmail({ hsEmailDirection: "EMAIL", hsEmailSubject: null }));
  assert.match(description, /\(no subject\)/);
});

test("describeEmail falls back to plain-text body preview when HTML preview is missing", () => {
  const { description } = describeEmail(
    buildEmail({ hsEmailDirection: "EMAIL", hsBodyPreviewHtml: null, hsBodyPreview: "plain preview text" }),
  );
  assert.match(description, /plain preview text/);
});

test("describeEmail renders an empty body when both preview fields are missing", () => {
  const { description } = describeEmail(
    buildEmail({ hsEmailDirection: "EMAIL", hsBodyPreviewHtml: null, hsBodyPreview: null }),
  );
  assert.equal(description.endsWith("<p></p>"), true);
});

test("describeEmail escapes HTML-special characters in the subject", () => {
  const { description } = describeEmail(
    buildEmail({ hsEmailDirection: "EMAIL", hsEmailSubject: "<script>alert(1)</script>" }),
  );
  assert.doesNotMatch(description, /<script>/);
  assert.match(description, /&lt;script&gt;/);
});

test("describeEmail includes From/To with names when available", () => {
  const { description } = describeEmail(
    buildEmail({
      hsEmailDirection: "EMAIL",
      hsEmailFromEmail: "anderson.lima@atento.com",
      hsEmailFromFirstname: "Anderson",
      hsEmailFromLastname: "Gouveia de Lima",
      hsEmailToEmail: "amir.velho@example.com",
      hsEmailToFirstname: "Amir",
      hsEmailToLastname: "Velho",
    }),
  );
  assert.match(description, /From: Anderson Gouveia de Lima &lt;anderson\.lima@atento\.com&gt;/);
  assert.match(description, /To: Amir Velho &lt;amir\.velho@example\.com&gt;/);
});

test("describeEmail formats multiple semicolon-separated recipients", () => {
  const { description } = describeEmail(
    buildEmail({
      hsEmailDirection: "EMAIL",
      hsEmailToEmail: "amir.velho@example.com;pamela.ignacio@atento.com",
      hsEmailToFirstname: "Amir;pamela.ignacio@atento.com",
      hsEmailToLastname: "Velho;",
    }),
  );
  assert.match(
    description,
    /To: Amir Velho &lt;amir\.velho@example\.com&gt;, pamela\.ignacio@atento\.com/,
  );
});

test("describeEmail falls back to bare emails when the name lists are shorter than the email list (a nameless participant, e.g. a shared inbox, is omitted rather than left blank)", () => {
  const { description } = describeEmail(
    buildEmail({
      hsEmailDirection: "EMAIL",
      hsEmailToEmail:
        "amir.velho@example.com;renato.ziza@example.com;pamela.ignacio@atento.com;support@example.com;gabriel.matsuzaki@atento.com.br",
      hsEmailToFirstname: "Amir;Renato;pamela.ignacio@atento.com;Gabriel",
      hsEmailToLastname: "Velho;Ziza;Matsuzaki",
    }),
  );
  assert.match(
    description,
    /To: amir\.velho@example\.com, renato\.ziza@example\.com, pamela\.ignacio@atento\.com, support@example\.com, gabriel\.matsuzaki@atento\.com\.br/,
  );
  // Must never attribute a name to the wrong address.
  assert.doesNotMatch(description, /Matsuzaki &lt;pamela/);
  assert.doesNotMatch(description, /Gabriel &lt;support/);
});

test("describeEmail falls back to just the email when no real display name was captured", () => {
  const { description } = describeEmail(
    buildEmail({
      hsEmailDirection: "EMAIL",
      hsEmailFromEmail: "pamela.ignacio@atento.com",
      hsEmailFromFirstname: "pamela.ignacio@atento.com",
      hsEmailFromLastname: null,
    }),
  );
  assert.match(description, /<p>From: pamela\.ignacio@atento\.com<\/p>/);
  assert.doesNotMatch(description, /pamela\.ignacio@atento\.com &lt;pamela\.ignacio@atento\.com&gt;/);
});

test("describeEmail omits the From/To block entirely when neither is present", () => {
  const { description } = describeEmail(buildEmail({ hsEmailDirection: "EMAIL", hsEmailSubject: "No participants" }));
  assert.doesNotMatch(description, /From:|To:/);
});
