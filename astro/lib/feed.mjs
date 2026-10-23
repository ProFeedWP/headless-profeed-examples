export const API_URL = "https://api.profeedwp.com/api/headless-profeed/v1";

export function configuration(env, browser = false) {
  const mode = env.mode;
  if (mode !== "demo" && mode !== "customer")
    throw new Error("Set the feed mode to demo or customer. See .env.example.");
  const base = (env.base || API_URL).replace(/\/$/, "");
  const url = new URL(base);
  if (
    url.protocol !== "https:" &&
    !(url.protocol === "http:" && url.hostname === "127.0.0.1")
  )
    throw new Error(
      "The API URL must use HTTPS (127.0.0.1 is allowed for fixture tests).",
    );
  if (mode === "demo") return { url: base + "/demo", headers: {} };
  if (!env.feedId || !/^[a-zA-Z0-9-]+$/.test(env.feedId))
    throw new Error(
      "Customer mode requires a feed ID. Copy it from your account.",
    );
  if (!env.key?.startsWith(browser ? "hp_pk_" : "hp_sk_"))
    throw new Error(
      browser
        ? "Customer browser mode requires a publishable key (hp_pk_), never a server key."
        : "Customer server mode requires a secret key (hp_sk_). Keep it server-only.",
    );
  return {
    url:
      base + "/feeds/" + encodeURIComponent(env.feedId) + "/posts?page_size=4",
    headers: { "X-API-Key": env.key },
  };
}

export function safeUrl(value, linkedin = false) {
  if (typeof value !== "string") return undefined;
  try {
    const url = new URL(value);
    if (linkedin)
      return url.protocol === "https:" &&
        (url.hostname === "linkedin.com" ||
          url.hostname.endsWith(".linkedin.com"))
        ? url.href
        : undefined;
    return url.protocol === "https:" ||
      (url.protocol === "http:" && url.hostname === "127.0.0.1")
      ? url.href
      : undefined;
  } catch {
    return undefined;
  }
}

export function retrySeconds(header, fallback = 30, now = Date.now()) {
  if (!header) return fallback;
  const seconds = /^\d+$/.test(header)
    ? Number(header)
    : Math.ceil((Date.parse(header) - now) / 1000);
  return Number.isFinite(seconds) ? Math.max(1, seconds) : fallback;
}

// 202 is an HTTP success but collection has not completed yet.
export async function readFeed(config, signal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  if (signal?.aborted) controller.abort();
  try {
    const response = await fetch(config.url, {
      headers: config.headers,
      cache: "no-store",
      credentials: "omit",
      signal: controller.signal,
    });
    const body = await response.json().catch(() => null);
    const retryAfter = retrySeconds(
      response.headers.get("Retry-After"),
      body?.retry_after_seconds || 30,
    );
    if (response.status === 202)
      return {
        state: "pending",
        posts: [],
        retryAfter,
        message:
          "The first collection is pending. Try again after the retry interval.",
      };
    if (!response.ok) {
      const message =
        response.status === 401
          ? "Invalid API key. Replace it in your environment."
          : response.status === 403
            ? "Access denied. Check your subscription, selected feed and exact allowed origin."
            : response.status === 429
              ? "Request allowance reached. Wait before retrying."
              : "The feed is temporarily unavailable. Check the feed status and try again later.";
      return {
        state: "error",
        posts: [],
        message,
        status: response.status,
        retryAfter,
      };
    }
    if (body?.success !== true || !Array.isArray(body.posts))
      return {
        state: "error",
        posts: [],
        message: "The API returned an unexpected response.",
        retryAfter,
      };
    const posts = body.posts.slice(0, 4).map((post, index) => {
      const date =
        typeof post.date_published === "string"
          ? new Date(post.date_published)
          : null;
      return {
        id: String(post.id ?? index),
        text: typeof post.text === "string" ? post.text : "",
        date:
          date && !Number.isNaN(date.valueOf())
            ? date.toISOString().slice(0, 10)
            : undefined,
        url: safeUrl(post.post_url, true),
        image:
          safeUrl(post.image_url) ||
          safeUrl(post.media_items?.find((m) => m.type === "image")?.url),
      };
    });
    return {
      state: posts.length ? "ready" : "empty",
      posts,
      stale: body.refresh?.stale === true,
      message: posts.length
        ? ""
        : "No published posts are available for this feed yet.",
    };
  } catch (error) {
    if (signal?.aborted) throw error;
    return {
      state: "error",
      posts: [],
      message:
        "The feed could not be reached. Check your connection and API configuration.",
      retryAfter: 30,
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}
