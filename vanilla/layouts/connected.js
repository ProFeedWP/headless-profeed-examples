import { configuration, readFeed } from "../lib/feed.mjs";
import { renderLayout, layoutIds } from "./render-layouts.mjs";
const layout =
  new URLSearchParams(location.search).get("layout") || "card-grid";
const root = document.querySelector("#feed-layout");
let cleanup = () => {},
  controller;
const env = {
  mode: import.meta.env.VITE_PROFEED_MODE,
  feedId: import.meta.env.VITE_PROFEED_FEED_ID,
  key: import.meta.env.VITE_PROFEED_PUBLISHABLE_KEY,
  base: import.meta.env.VITE_PROFEED_API_URL,
};
async function load() {
  cleanup();
  controller?.abort();
  const request = new AbortController();
  controller = request;
  try {
    if (!layoutIds.includes(layout))
      throw new Error("Choose one of the six supported layouts.");
    const config = configuration(env, true);
    renderLayout(root, { state: "loading" }, layout);
    const result = await readFeed(config, request.signal);
    if (!request.signal.aborted)
      cleanup = renderLayout(root, result, layout, load);
  } catch (error) {
    if (!request.signal.aborted)
      cleanup = renderLayout(
        root,
        { state: "error", message: error.message },
        "card-grid",
      );
  }
}
window.addEventListener(
  "pagehide",
  () => {
    controller?.abort();
    cleanup();
  },
  { once: true },
);
load();
