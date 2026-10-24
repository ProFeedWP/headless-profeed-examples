import { safeUrl } from "../lib/feed.mjs";
export const layoutIds = [
  "card-grid",
  "news-list",
  "featured-update",
  "image-gallery",
  "dark-carousel",
  "company-timeline",
];
const element = (tag, text, className) => {
  const node = document.createElement(tag);
  if (text) node.textContent = text;
  if (className) node.className = className;
  return node;
};

/** Render a normalized readFeed result. Returns cleanup for retry timers. */
export function renderLayout(
  root,
  result,
  layout = "card-grid",
  onRetry = () => {},
) {
  root.replaceChildren();
  if (!layoutIds.includes(layout)) throw new Error("Unknown feed layout.");
  root.className = "feed-layout layout-" + layout;
  root.dataset.state = result.state;
  let timer;
  if (result.state !== "ready") {
    const box = element("div", null, "feed-state");
    box.append(
      element(
        "h2",
        result.state === "loading"
          ? "Loading company posts…"
          : result.state === "empty"
            ? "No published posts yet"
            : result.state === "pending"
              ? "Your first collection is on its way"
              : "We couldn’t load the feed",
      ),
    );
    if (result.message) box.append(element("p", result.message));
    if (["pending", "error"].includes(result.state) && result.retryAfter) {
      const button = element("button");
      button.type = "button";
      const retryAt = Date.now() + result.retryAfter * 1000;
      const tick = () => {
        const seconds = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
        button.disabled = seconds > 0;
        button.textContent = seconds
          ? "Try again in " + seconds + "s"
          : "Try again";
        if (!seconds) clearInterval(timer);
      };
      timer = setInterval(tick, 1000);
      tick();
      button.addEventListener("click", onRetry);
      box.append(button);
    }
    root.append(box);
    return () => clearInterval(timer);
  }
  if (result.stale)
    root.append(
      element(
        "p",
        "Showing cached posts while the source refreshes.",
        "feed-cache-note",
      ),
    );
  const posts = (result.posts || []).slice(0, 4);
  if (!posts.length)
    return renderLayout(
      root,
      {
        state: "empty",
        message: "No published posts are available for this feed yet.",
      },
      layout,
      onRetry,
    );
  const list = element("div", null, "posts");
  for (const [index, post] of posts.entries()) {
    const card = element("article", null, "layout-post");
    card.dataset.postId = String(post.id ?? index);
    const body = element("div", null, "post-body");
    body.append(
      element(
        "p",
        layout === "featured-update" && index === 0
          ? "In the spotlight"
          : "Company update",
        "post-kicker",
      ),
    );
    const date =
      post.date &&
      /^\d{4}-\d{2}-\d{2}$/.test(post.date) &&
      !Number.isNaN(Date.parse(post.date))
        ? post.date
        : null;
    if (date) {
      const time = element(
        "time",
        new Intl.DateTimeFormat("en", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }).format(new Date(date)),
      );
      time.dateTime = date;
      body.append(time);
    }
    body.append(
      element("p", typeof post.text === "string" ? post.text : "", "post-text"),
    );
    const image = safeUrl(post.image);
    if (image && layout !== "news-list") {
      const img = element("img");
      img.src = image;
      img.alt = "";
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener(
        "error",
        () => {
          img.remove();
          card.classList.add("no-media");
        },
        { once: true },
      );
      card.append(img);
    } else card.classList.add("no-media");
    const url = safeUrl(post.url, true);
    if (url) {
      const a = element("a", "View on LinkedIn ↗");
      a.href = url;
      a.target = "_blank";
      a.rel = "noreferrer";
      body.append(a);
    }
    card.append(body);
    list.append(card);
  }
  if (layout === "dark-carousel") {
    list.classList.add("carousel-track");
    list.tabIndex = 0;
    list.setAttribute(
      "aria-label",
      "Company updates carousel. Use left and right arrow keys to browse.",
    );
    list.setAttribute("role", "region");
    const controls = element("div", null, "carousel-controls");
    const previous = element("button", "← Previous"),
      next = element("button", "Next →");
    previous.type = next.type = "button";
    const status = element("span");
    status.setAttribute("role", "status");
    let current = 0;
    const visibleCount = () =>
      window.matchMedia("(max-width: 600px)").matches ? 1 : 2;
    const update = () => {
      const size = visibleCount();
      const cardWidth =
        list.firstElementChild?.getBoundingClientRect().width || 1;
      current = Math.min(
        posts.length - size,
        Math.max(0, Math.round(list.scrollLeft / (cardWidth + 20))),
      );
      previous.disabled = current === 0;
      next.disabled = current >= posts.length - size;
      status.textContent =
        "Updates " +
        (current + 1) +
        "–" +
        Math.min(posts.length, current + size) +
        " of " +
        posts.length;
    };
    const move = (index) => {
      const width = list.firstElementChild?.getBoundingClientRect().width || 0;
      list.scrollTo({
        left: Math.max(0, index) * (width + 20),
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    };
    previous.addEventListener("click", () => move(current - 1));
    next.addEventListener("click", () => move(current + 1));
    list.addEventListener("scroll", update, { passive: true });
    list.addEventListener("keydown", (event) => {
      if (event.target !== list) return;
      const actions = {
        ArrowLeft: current - 1,
        ArrowRight: current + 1,
        Home: 0,
        End: posts.length,
      };
      if (event.key in actions) {
        event.preventDefault();
        move(actions[event.key]);
      }
    });
    controls.append(previous, status, next);
    root.append(controls, list);
    const observer = new ResizeObserver(update);
    observer.observe(list);
    requestAnimationFrame(update);
    return () => observer.disconnect();
  }
  root.append(list);
  return () => {};
}
