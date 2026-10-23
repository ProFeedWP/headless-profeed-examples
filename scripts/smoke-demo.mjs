const url = "https://api.profeedwp.com/api/headless-profeed/v1/demo";
const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
if (response.status === 202)
  throw new Error(
    "Demo collection pending; retry after " +
      response.headers.get("Retry-After"),
  );
if (!response.ok)
  throw new Error(
    "Demo returned HTTP " +
      response.status +
      "; retry after " +
      response.headers.get("Retry-After"),
  );
const body = await response.json();
if (body.success !== true || !Array.isArray(body.posts))
  throw new Error("Unexpected demo response");
console.log(
  "Public demo verified: HTTP 200, " +
    body.posts.length +
    " posts. No customer credentials used.",
);
