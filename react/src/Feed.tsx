import { useEffect, useState } from "react";
import { configuration, readFeed } from "../lib/feed.mjs";
const env = {
  mode: import.meta.env.VITE_PROFEED_MODE,
  feedId: import.meta.env.VITE_PROFEED_FEED_ID,
  key: import.meta.env.VITE_PROFEED_PUBLISHABLE_KEY,
  base: import.meta.env.VITE_PROFEED_API_URL,
};
type Post = {
  id: string;
  text: string;
  date?: string;
  url?: string;
  image?: string;
};
type Result = {
  state: string;
  posts: Post[];
  message?: string;
  stale?: boolean;
  retryAfter?: number;
};
export function Feed() {
  const [result, setResult] = useState<Result>({ state: "loading", posts: [] });
  const [attempt, setAttempt] = useState(0);
  const [retryAt, setRetryAt] = useState(0);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setResult({ state: "loading", posts: [] });
    (async () => {
      try {
        const next = await readFeed(
          configuration(env, true),
          controller.signal,
        );
        if (active) {
          setResult(next);
          setNow(Date.now());
          setRetryAt(Date.now() + (next.retryAfter || 0) * 1000);
        }
      } catch (error) {
        if (active && !controller.signal.aborted)
          setResult({
            state: "error",
            posts: [],
            message:
              error instanceof Error
                ? error.message
                : "Check your configuration.",
          });
      }
    })();
    return () => {
      active = false;
      controller.abort();
    };
  }, [attempt]);
  useEffect(() => {
    if (retryAt <= Date.now()) return;
    const timer = setInterval(() => {
      const time = Date.now();
      setNow(time);
      if (time >= retryAt) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [retryAt]);
  const wait = Math.max(0, Math.ceil((retryAt - now) / 1000));
  return (
    <section
      aria-label="Company posts"
      aria-live="polite"
      data-state={result.state}
    >
      {result.state === "loading" && (
        <p className="status">Loading company posts…</p>
      )}
      {result.message && <p className="status">{result.message}</p>}
      {result.stale && <p>Showing cached posts while the source refreshes.</p>}
      <div className="feed">
        {result.posts.map((post) => (
          <article className="post" key={post.id}>
            <div className="eyebrow">Company update</div>
            {post.date && <time dateTime={post.date}>{post.date}</time>}
            <p>{post.text}</p>
            {post.image && (
              <img
                src={post.image}
                alt=""
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            )}
            {post.url && (
              <a href={post.url} target="_blank" rel="noreferrer">
                View on LinkedIn ↗
              </a>
            )}
          </article>
        ))}
      </div>
      {(result.state === "error" || result.state === "pending") && (
        <button disabled={wait > 0} onClick={() => setAttempt((n) => n + 1)}>
          {wait > 0 ? "Try again in " + wait + "s" : "Try again"}
        </button>
      )}
    </section>
  );
}
