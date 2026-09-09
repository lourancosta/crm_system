import assert from "node:assert/strict";
import test from "node:test";
import { buildTicketContent, resolveContactName, threadCandidateMessageIds } from "./inboundEmail.service";

test("threadCandidateMessageIds collects In-Reply-To and References, deduped", () => {
  const ids = threadCandidateMessageIds({
    inReplyTo: "<msg-2@mail.test>",
    references: ["<msg-1@mail.test>", "<msg-2@mail.test>"],
  });

  assert.deepEqual(ids, ["<msg-2@mail.test>", "<msg-1@mail.test>"]);
});

test("threadCandidateMessageIds returns an empty list for a brand-new thread", () => {
  const ids = threadCandidateMessageIds({});
  assert.deepEqual(ids, []);
});

test("resolveContactName splits a display name into first/last", () => {
  assert.deepEqual(resolveContactName("Jane Doe", "jane@acme.test"), { firstname: "Jane", lastname: "Doe" });
});

test("resolveContactName handles multi-word last names", () => {
  assert.deepEqual(resolveContactName("Mary Jane Watson", "mj@acme.test"), {
    firstname: "Mary",
    lastname: "Jane Watson",
  });
});

test("resolveContactName falls back to the email local-part when there's no display name", () => {
  assert.deepEqual(resolveContactName(undefined, "jane@acme.test"), { firstname: "jane", lastname: null });
});

test("buildTicketContent prefers html over plain text", () => {
  const { subject, content } = buildTicketContent({
    subject: "Help needed",
    text: "plain body",
    html: "<p>rich body</p>",
  });
  assert.equal(subject, "Help needed");
  assert.equal(content, "<p>rich body</p>");
});

test("buildTicketContent escapes and wraps plain text when there's no html", () => {
  const { content } = buildTicketContent({ text: "<script>alert(1)</script>" });
  assert.equal(content, "<p>&lt;script&gt;alert(1)&lt;/script&gt;</p>");
});

test("buildTicketContent falls back to a default subject", () => {
  const { subject } = buildTicketContent({});
  assert.equal(subject, "New support request");
});
