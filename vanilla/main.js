import "./style.css";
import { configuration, readFeed } from "./lib/feed.mjs";
const container = document.querySelector("#posts");
const status = document.querySelector("#status");
const retry = document.querySelector("#retry");
let controller;
let retryAt = 0;
const text = (tag, value) => {
  const el = document.createElement(tag);
  el.textContent = value;
  return el;
};
async function load() {
  controller?.abort();
  controller = new AbortController();
  retry.hidden = true;
  container.replaceChildren();
  status.hidden = false;
  status.textContent = "Loading company posts…";
  try {
    const config = configuration(
      {
        mode: import.meta.env.VITE_PROFEED_MODE,
        feedId: import.meta.env.VITE_PROFEED_FEED_ID,
        key: import.meta.env.VITE_PROFEED_PUBLISHABLE_KEY,
        base: import.meta.env.VITE_PROFEED_API_URL,
      },
      true,
    );
    const result = await readFeed(config, controller.signal);
    document.querySelector("#feed").dataset.state = result.state;
    status.textContent =
      result.message ||
      (result.stale ? "Showing cached posts while the source refreshes." : "");
    status.hidden = !status.textContent;
    for (const post of result.posts) {
      const card = document.createElement("article");
      card.className = "post";
      const label = text("div", "Company update");
      label.className = "eyebrow";
      card.append(label);
      if (post.date) {
        const time = text("time", post.date);
        time.dateTime = post.date;
        card.append(time);
      }
      card.append(text("p", post.text));
      if (post.image) {
        const img = document.createElement("img");
        img.src = post.image;
        img.alt = "";
        img.loading = "lazy";
        img.referrerPolicy = "no-referrer";
        card.append(img);
      }
      if (post.url) {
        const a = text("a", "View on LinkedIn ↗");
        a.href = post.url;
        a.target = "_blank";
        a.rel = "noreferrer";
        card.append(a);
      }
      container.append(card);
    }
    retry.hidden = !["pending", "error"].includes(result.state);
    retryAt = Date.now() + (result.retryAfter || 0) * 1000;
    tick();
  } catch (error) {
    if (!controller.signal.aborted) {
      status.textContent = error.message;
      document.querySelector("#feed").dataset.state = "error";
    }
  }
}
function tick() {
  const wait = Math.max(0, Math.ceil((retryAt - Date.now()) / 1000));
  retry.disabled = wait > 0;
  retry.textContent = wait ? "Try again in " + wait + "s" : "Try again";
}
const timer = setInterval(tick, 1000);
retry.addEventListener("click", load);
window.addEventListener(
  "pagehide",
  () => {
    controller?.abort();
    clearInterval(timer);
  },
  { once: true },
);
load();
