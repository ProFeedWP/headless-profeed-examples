import { test } from "node:test";
import assert from "node:assert/strict";
import {
  configuration,
  readFeed,
  retrySeconds,
  safeUrl,
} from "../lib/feed.mjs";
test("explicit modes and key boundaries", () => {
  assert.throws(() => configuration({}));
  assert.throws(() => configuration({ mode: "customer" }));
  assert.throws(() =>
    configuration(
      { mode: "customer", feedId: "feed", key: "hp_sk_fake" },
      true,
    ),
  );
  assert.throws(() =>
    configuration({ mode: "customer", feedId: "feed", key: "hp_pk_fake" }),
  );
  assert.deepEqual(
    configuration({ mode: "demo", key: "hp_sk_unused" }).headers,
    {},
  );
});
test("safe links and retry timing", () => {
  assert.equal(safeUrl("javascript:alert(1)"), undefined);
  assert.equal(safeUrl("https://linkedin.com.evil.example", true), undefined);
  assert.equal(
    safeUrl("https://www.linkedin.com/posts/example", true),
    "https://www.linkedin.com/posts/example",
  );
  assert.equal(retrySeconds("120"), 120);
  assert.equal(retrySeconds("Thu, 01 Jan 1970 00:01:00 GMT", 30, 0), 60);
});
test("pending precedes success, optional fields and all failures", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [202, 401, 403, 429, 503]) {
      globalThis.fetch = async () =>
        new Response(JSON.stringify({ success: true, posts: [] }), {
          status,
          headers: { "Retry-After": "60" },
        });
      const result = await readFeed({
        url: "https://example.test",
        headers: {},
      });
      assert.equal(result.state, status === 202 ? "pending" : "error");
      assert.equal(result.retryAfter, 60);
    }
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ success: true, posts: [] }));
    assert.equal(
      (await readFeed({ url: "https://example.test", headers: {} })).state,
      "empty",
    );
    globalThis.fetch = async () =>
      new Response(
        JSON.stringify({
          success: true,
          posts: Array.from({ length: 6 }, () => ({
            text: "<script>alert(1)</script>",
          })),
        }),
      );
    const result = await readFeed({ url: "https://example.test", headers: {} });
    assert.equal(result.posts.length, 4);
    assert.equal(result.posts[0].date, undefined);
    assert.equal(result.posts[0].text, "<script>alert(1)</script>");
    globalThis.fetch = async () => {
      throw new Error("network");
    };
    assert.equal(
      (await readFeed({ url: "https://example.test", headers: {} })).state,
      "error",
    );
  } finally {
    globalThis.fetch = original;
  }
});
