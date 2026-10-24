// Authored example content by Accomplice AB; these are not actual LinkedIn posts.
const text = [
  "A new chapter for our team. We’re building a more thoughtful web, one useful idea at a time. Here’s a little of what we’ve been working on.",
  "From first sketch to launch. A look at the details, conversations, and small decisions that shaped our latest project.",
  "Good ideas grow through conversation. This week, we made time to share what we learned and explore what comes next.",
  "A little progress, every day. Thank you for following our journey. We look forward to sharing the next chapter with you.",
];
const images = [
  new URL("./artwork-1.svg", import.meta.url).href,
  new URL("./artwork-2.svg", import.meta.url).href,
  new URL("./artwork-3.svg", import.meta.url).href,
  new URL("./artwork-4.svg", import.meta.url).href,
];
export const samplePosts = text.map((text, index) => ({
  id: "authored-" + index,
  text,
  date: "2026-10-" + (23 - index),
  url: "https://www.linkedin.com/company/profeedwp/",
  image: images[index],
}));
