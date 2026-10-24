import { renderLayout, layoutIds } from "./render-layouts.mjs";
import { samplePosts } from "./sample-posts.mjs";
const layout =
  new URLSearchParams(location.search).get("layout") || "card-grid";
const names = {
  "card-grid": "The latest from our team",
  "news-list": "News & notes",
  "featured-update": "Ideas worth sharing",
  "image-gallery": "A little of what we do",
  "dark-carousel": "Good things are happening",
  "company-timeline": "Our story, as it unfolds",
};
const root = document.querySelector("#feed-layout");
let cleanup = () => {};
if (!layoutIds.includes(layout)) {
  root.textContent = "Choose one of the six supported feed designs.";
  throw new Error("Unknown layout");
}
document.body.dataset.layout = layout;
document.querySelector("#design-title").textContent = names[layout];
function show() {
  cleanup();
  const state = document.querySelector("#sample-state").value;
  let result = { state: "ready", posts: samplePosts };
  if (state === "empty")
    result = {
      state: "empty",
      posts: [],
      message: "There are no published posts to show yet.",
    };
  if (state === "optional")
    result = {
      state: "ready",
      posts: samplePosts.map(({ image, date, url, ...post }) => post),
    };
  if (state === "long")
    result = {
      state: "ready",
      posts: samplePosts.map((post) => ({
        ...post,
        text:
          (post.text + " ").repeat(8) +
          " <script>This is text, not HTML.</script>",
      })),
    };
  if (state === "pending")
    result = {
      state: "pending",
      posts: [],
      retryAfter: 2,
      message:
        "Sample state: collection has not completed yet. This is different from a completed empty feed.",
    };
  if (["unauthorized", "forbidden", "limited", "unavailable"].includes(state))
    result = {
      state: "error",
      posts: [],
      retryAfter: 2,
      message: {
        unauthorized:
          "Sample state: invalid API key. Replace it in your project settings.",
        forbidden:
          "Sample state: access denied. Check your subscription, feed scope, and exact allowed origin.",
        limited:
          "Sample state: request allowance reached. Wait before retrying.",
        unavailable: "Sample state: temporarily unavailable. Try again later.",
      }[state],
    };
  cleanup = renderLayout(root, result, layout, () => {
    document.querySelector("#sample-state").value = "ready";
    show();
  });
  document.body.dataset.ready = "true";
}
document.querySelector("#sample-state").addEventListener("change", show);
show();
let frame;
const resize = () => {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    if (parent !== window)
      parent.postMessage(
        {
          type: "profeed-preview-height",
          height: Math.ceil(document.body.getBoundingClientRect().height),
        },
        location.origin,
      );
  });
};
const observer = new ResizeObserver(resize);
observer.observe(document.body);
window.addEventListener("resize", resize);
window.addEventListener(
  "pagehide",
  () => {
    cleanup();
    observer.disconnect();
    cancelAnimationFrame(frame);
  },
  { once: true },
);
