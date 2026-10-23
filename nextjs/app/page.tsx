import { configuration, readFeed } from "../lib/feed.mjs";
export const dynamic = "force-dynamic";
export default async function Page() {
  let result: {
    state: string;
    posts: {
      id: string;
      text: string;
      date?: string;
      url?: string;
      image?: string;
    }[];
    message?: string;
    retryAfter?: number;
    stale?: boolean;
  };
  try {
    result = await readFeed(
      configuration({
        mode: process.env.PROFEED_MODE,
        feedId: process.env.PROFEED_FEED_ID,
        key: process.env.PROFEED_SECRET_KEY,
        base: process.env.PROFEED_API_URL,
      }),
    );
  } catch (error) {
    result = {
      state: "error",
      posts: [],
      message:
        error instanceof Error ? error.message : "Check your configuration.",
    };
  }
  return (
    <main>
      <p className="eyebrow">Headless Profeed / Next.js</p>
      <h1>Your company. Your feed.</h1>
      <p className="intro">
        Public LinkedIn company posts, rendered on your server with your own
        design.
      </p>
      <section aria-label="Company posts" data-state={result.state}>
        {result.message && <p className="status">{result.message}</p>}
        {result.state === "pending" && (
          <p>Wait {result.retryAfter} seconds before reloading this page.</p>
        )}
        {result.state === "error" && result.retryAfter && (
          <p>Wait at least {result.retryAfter} seconds before retrying.</p>
        )}
        {result.stale && (
          <p>Showing cached posts while the source refreshes.</p>
        )}
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
      </section>
      <footer>
        Demo mode uses the public demo endpoint. Screenshots use authored sample
        posts.
      </footer>
      <nav className="links">
        <a href="https://headless.profeedwp.com/guides/nextjs-linkedin-feed">
          Integration guide
        </a>
        <a href="https://headless.profeedwp.com/docs">API quickstart</a>
      </nav>
    </main>
  );
}
