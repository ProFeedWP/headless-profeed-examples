import assert from "node:assert/strict";
import path from "node:path";
import { layoutIds } from "../vanilla/layouts/render-layouts.mjs";

export async function checkLayouts(page, url, root, setScenario) {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const external = [];
  const errors = [];
  const requestListener = (request) => {
    if (!request.url().startsWith(url)) external.push(request.url());
  };
  const errorListener = (error) => errors.push(error.message);
  page.on("request", requestListener);
  page.on("pageerror", errorListener);
  try {
    for (const layout of layoutIds) {
      await page.setViewportSize({ width: 1120, height: 1000 });
      await page.goto(url + "/layouts/index.html?layout=" + layout);
      await page.locator('body[data-ready="true"]').waitFor();
      assert.equal(await page.locator(".layout-post").count(), 4);
      assert.equal(await page.locator('.layout-post img').count(),layout==='news-list'?0:4,'Expected authored artwork in '+layout);
      await page
        .locator(".layout-post img")
        .evaluateAll((images) =>
          Promise.all(images.map((image) => image.decode())),
        );
      await page
        .locator("main")
        .screenshot({
          path: path.join(root, "screenshots", "ai-" + layout + ".png"),
        });
      if (layout === "dark-carousel") {
        const track = page.locator(".carousel-track");
        await track.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForFunction(
          () => document.querySelector(".carousel-track").scrollLeft > 0,
        );
        await page.keyboard.press("End");
        await page.waitForFunction(
          () =>
            document.querySelector(".carousel-controls span").textContent ===
            "Updates 3–4 of 4",
        );
        await page.keyboard.press("Home");
        await page.waitForFunction(
          () => document.querySelector(".carousel-track").scrollLeft === 0,
        );
        await page.waitForFunction(
          () => document.querySelector(".carousel-controls button").disabled,
        );
      }
      for (const width of [1440, 768, 390, 320]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Layout overflow: " + layout + " " + width,
        );
      }
      await page.locator(".sample-controls summary").click();
      for (const state of [
        "empty",
        "optional",
        "long",
        "pending",
        "unauthorized",
        "forbidden",
        "limited",
        "unavailable",
      ]) {
        await page.selectOption("#sample-state", state);
        if (state === "empty")
          assert.equal(await page.locator(".layout-post").count(), 0);
        if (state === "optional") {
          assert.equal(
            await page
              .locator(".layout-post img,.layout-post time,.layout-post a")
              .count(),
            0,
          );
          assert.equal(await page.locator(".layout-post").count(), 4);
        }
        if (state === "long") {
          assert.equal(await page.locator(".layout-post script").count(), 0);
          assert(
            (await page.locator(".post-text").first().textContent()).includes(
              "<script>",
            ),
          );
          assert(
            await page.evaluate(
              () => document.documentElement.scrollWidth <= innerWidth,
            ),
            "Long text overflow: " + layout,
          );
        }
        if (state === "pending" || state === "limited")
          assert(await page.locator(".feed-state button").isDisabled());
      }
      if (layout === "card-grid") {
        await page.selectOption("#sample-state", "pending");
        await page
          .getByRole("button", { name: "Try again", exact: true })
          .waitFor();
        await page
          .getByRole("button", { name: "Try again", exact: true })
          .click();
        assert.equal(await page.locator(".layout-post").count(), 4);
      }
    }
    assert.deepEqual(
      external,
      [],
      "Sample previews must not call the feed API or remote assets.",
    );
  } finally {
    page.off("request", requestListener);
    page.off("pageerror", errorListener);
  }
  assert.deepEqual(errors, []);
  for (const layout of layoutIds) {
    setScenario("populated");
    await page.goto(url + "/layouts/connected.html?layout=" + layout);
    await page.locator('[data-state="ready"]').waitFor();
    assert.equal(await page.locator(".layout-post").count(), 4);
    assert.deepEqual(
      await page
        .locator(".layout-post")
        .evaluateAll((nodes) => nodes.map((node) => node.dataset.postId)),
      ["sample-0", "sample-1", "sample-2", "sample-3"],
    );
  }
  for (const [scenario, state] of [
    ["empty", "empty"],
    ["pending", "pending"],
    ["unauthorized", "error"],
    ["forbidden", "error"],
    ["limited", "error"],
    ["unavailable", "error"],
    ["unsafe", "ready"],
  ]) {
    setScenario(scenario);
    await page.goto(url + "/layouts/connected.html?layout=card-grid");
    await page.locator('[data-state="' + state + '"]').waitFor();
    if (["limited", "pending"].includes(scenario))
      assert(await page.locator(".feed-state button").isDisabled());
    if (scenario === "unsafe")
      assert.equal(
        await page
          .locator(".layout-post a,.layout-post img,.layout-post script")
          .count(),
        0,
      );
  }
  setScenario("populated");
  console.log(
    "Six feed layouts: sample isolation, screenshots, responsive states, carousel keyboard controls and customer API fixtures passed.",
  );
}
