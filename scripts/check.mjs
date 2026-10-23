import { createServer } from "node:http";
import { spawn } from "node:child_process";
import { readFile, mkdir, writeFile, readdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import assert from "node:assert/strict";
import { chromium } from "@playwright/test";

const root = path.resolve(import.meta.dirname, "..");
const names = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ["nextjs", "react", "vanilla", "astro"];
for (const name of names)
  if (!["nextjs", "react", "vanilla", "astro"].includes(name))
    throw new Error("Unknown example: " + name);
const canary = "hp_sk_FIXTURE_ONLY_SERVER_CANARY_7426";
const publicKey = "hp_pk_FIXTURE_ONLY_PUBLIC_KEY";
let scenario = "populated";
let requests = [];
const fixture = createServer((req, res) => {
  requests.push({
    at: Date.now(),
    key: req.headers["x-api-key"],
    origin: req.headers.origin,
  });
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "X-API-Key");
  res.setHeader("Access-Control-Expose-Headers", "Retry-After");
  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }
  if (req.url === "/image.svg") {
    res.setHeader("Content-Type", "image/svg+xml");
    res.end(
      '<svg xmlns="http://www.w3.org/2000/svg" width="800" height="360"><rect width="800" height="360" fill="#d8edf6"/><circle cx="620" cy="160" r="130" fill="#89c5e2"/><text x="45" y="185" font-family="sans-serif" font-size="42" fill="#17485e">Built for your next idea.</text></svg>',
    );
    return;
  }
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Retry-After", "2");
  if (
    ["pending", "unauthorized", "forbidden", "limited", "unavailable"].includes(
      scenario,
    )
  ) {
    res.statusCode = {
      pending: 202,
      unauthorized: 401,
      forbidden: 403,
      limited: 429,
      unavailable: 503,
    }[scenario];
    res.end(
      JSON.stringify({
        success: scenario === "pending",
        posts: [],
        retry_after_seconds: 2,
      }),
    );
    return;
  }
  const texts = [
    "A new chapter for our team. We’re sharing what we learn as we build useful things for the web.",
    "From first sketch to launch. Here’s a small look at the work behind our latest release.",
    "Good ideas grow through conversation. What are you working on this week?",
    "A little progress, every day. Thanks for following along.",
  ];
  const posts =
    scenario === "empty"
      ? []
      : texts
          .concat("This fifth post should not render.")
          .map((text, i) => ({
            id: "sample-" + i,
            text:
              scenario === "unsafe"
                ? "<img src=x onerror=window.INJECTED=true>"
                : text,
            ...(i !== 3 && {
              date_published: "2026-10-" + (20 + i) + "T10:00:00Z",
              post_url: "https://www.linkedin.com/company/profeedwp/",
            }),
            ...(i === 1 &&
              scenario !== "unsafe" && {
                image_url:
                  "http://127.0.0.1:" + fixture.address().port + "/image.svg",
              }),
            ...(scenario === "unsafe" && {
              post_url: "javascript:alert(1)",
              image_url: "javascript:alert(1)",
            }),
          }));
  res.end(JSON.stringify({ success: true, posts, refresh: { stale: false } }));
});
await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
const api = "http://127.0.0.1:" + fixture.address().port;
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHANNEL
    ? { channel: process.env.PLAYWRIGHT_CHANNEL }
    : {},
);
async function run(file, args, cwd, env, expectFailure = false) {
  return await new Promise((resolve, reject) => {
    let output = "";
    const child = spawn(process.execPath, [file, ...args], {
      cwd,
      env: {
        ...process.env,
        ...env,
        NEXT_TELEMETRY_DISABLED: "1",
        ASTRO_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    });
    child.stdout.on("data", (c) => (output += c));
    child.stderr.on("data", (c) => (output += c));
    child.on("error", reject);
    child.on("exit", (code) => {
      if (expectFailure ? code !== 0 : code === 0) resolve(output);
      else
        reject(
          new Error("Command failed (" + code + "): " + file + "\n" + output),
        );
    });
  });
}
async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) await scan(file);
    else if (/\.(html|js|json|txt|css|map)$/.test(file))
      assert(
        !(await readFile(file, "utf8")).includes(canary),
        "Server key in publication artifact: " + file,
      );
  }
}
try {
  for (const name of names) {
    console.log("Checking " + name + " with Node " + process.version);
    scenario = "populated";
    requests = [];
    const cwd = path.join(root, name),
      isBrowser = ["react", "vanilla"].includes(name);
    const env = isBrowser
      ? {
          VITE_PROFEED_MODE: "customer",
          VITE_PROFEED_FEED_ID: "fixture",
          VITE_PROFEED_PUBLISHABLE_KEY: publicKey,
          VITE_PROFEED_API_URL: api,
        }
      : {
          PROFEED_MODE: "customer",
          PROFEED_FEED_ID: "fixture",
          PROFEED_SECRET_KEY: canary,
          PROFEED_API_URL: api,
        };
    await run("--test", ["test/feed.test.mjs"], cwd, env);
    if (name === "react")
      await run("node_modules/typescript/bin/tsc", ["--noEmit"], cwd, env);
    const cli =
      name === "nextjs"
        ? "node_modules/next/dist/bin/next"
        : name === "astro"
          ? "node_modules/astro/bin/astro.mjs"
          : "node_modules/vite/bin/vite.js";
    await run(cli, ["build"], cwd, env);
    const port = 4400 + ["nextjs", "react", "vanilla", "astro"].indexOf(name);
    let serverOutput = "";
    const server = spawn(
      process.execPath,
      [
        cli,
        name === "nextjs" ? "start" : "preview",
        "--port",
        String(port),
        "--host",
        "127.0.0.1",
      ].filter(
        (arg, i, a) =>
          name !== "nextjs" || (arg !== "--host" && a[i - 1] !== "--host"),
      ),
      {
        cwd,
        env: { ...process.env, ...env, NEXT_TELEMETRY_DISABLED: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    server.stdout.on("data", (c) => (serverOutput += c));
    server.stderr.on("data", (c) => (serverOutput += c));
    const page = await browser.newPage({
      viewport: { width: 1120, height: 1000 },
    });
    const url = "http://127.0.0.1:" + port;
    try {
      let started = false;
      for (let i = 0; i < 120; i++) {
        try {
          const r = await fetch(url);
          if (r.ok) {
            started = true;
            break;
          }
        } catch {}
        await new Promise((r) => setTimeout(r, 250));
      }
      assert(started, "Server did not start: " + serverOutput);
      const visit = async (state) => {
        await page.goto(url);
        await page.locator('[data-state="' + state + '"]').waitFor();
        assert(
          !(await page.content()).includes(canary),
          "Secret appeared in rendered HTML",
        );
      };
      await visit("ready");
      assert.equal(await page.locator(".post").count(), 4);
      assert.equal(await page.locator("time").count(), 3);
      await page
        .locator(".post img")
        .evaluateAll((images) =>
          Promise.all(images.map((img) => img.decode())),
        );
      await mkdir(path.join(root, "screenshots"), { recursive: true });
      await page.screenshot({
        path: path.join(root, "screenshots", name + ".png"),
        fullPage: true,
      });
      for (const width of [320, 390, 768, 1440]) {
        await page.setViewportSize({ width, height: 1000 });
        assert(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
          "Horizontal overflow at " + width,
        );
      }
      assert(
        requests.some((r) => r.key === (isBrowser ? publicKey : canary)),
        "Expected key type was not sent",
      );
      if (name !== "astro") {
        for (const [value, state] of [
          ["empty", "empty"],
          ["pending", "pending"],
          ["unauthorized", "error"],
          ["forbidden", "error"],
          ["limited", "error"],
          ["unavailable", "error"],
          ["unsafe", "ready"],
        ]) {
          scenario = value;
          await visit(state);
          if (value === "empty")
            assert.equal(await page.locator(".post").count(), 0);
          if (["limited", "pending"].includes(value) && isBrowser) {
            assert(
              await page.locator("button").isDisabled(),
              "Retry must wait",
            );
            const count = requests.length;
            await page.waitForTimeout(500);
            assert.equal(
              requests.length,
              count,
              "Unexpected polling before Retry-After",
            );
          }
          if (value === "unsafe") {
            assert.equal(await page.evaluate(() => window.INJECTED), undefined);
            assert.equal(await page.locator(".post a,.post img").count(), 0);
            assert(
              (await page.locator(".post p").first().textContent()).includes(
                "<img",
              ),
            );
          }
        }
      }
      if (name === "nextjs") await scan(path.join(cwd, ".next/static"));
      else await scan(path.join(cwd, "dist"));
    } finally {
      await page.close();
      server.kill();
    }
    if (name === "astro") {
      for (const value of [
        "pending",
        "unauthorized",
        "forbidden",
        "limited",
        "unavailable",
      ]) {
        scenario = value;
        const output = await run(cli, ["build"], cwd, env, true);
        assert(output.includes("Headless Profeed build stopped"));
      }
      scenario = "empty";
      await run(cli, ["build"], cwd, env);
      assert(
        (await readFile(path.join(cwd, "dist/index.html"), "utf8")).includes(
          'data-state="empty"',
        ),
      );
      scenario = "populated";
      await run(cli, ["build"], cwd, env);
      await scan(path.join(cwd, "dist"));
    }
    console.log(
      name +
        ": production build, states, text safety, responsive layout and key isolation passed.",
    );
  }
  const checksums = {};
  for (const name of ["nextjs", "react", "vanilla", "astro"]) {
    try {
      checksums[name + ".png"] = createHash("sha256")
        .update(await readFile(path.join(root, "screenshots", name + ".png")))
        .digest("hex");
    } catch {}
  }
  await writeFile(
    path.join(root, "screenshots/provenance.json"),
    JSON.stringify(
      {
        source:
          "Authored fixture posts and SVG, created by Accomplice AB; no customer or third-party media.",
        testedOn: "2026-10-24",
        node: process.version,
        versions: {
          next: "16.4.3",
          react: "19.3.1",
          vite: "8.3.5",
          astro: "7.4.2",
        },
        checksums,
      },
      null,
      2,
    ) + "\n",
  );
} finally {
  await browser.close();
  fixture.close();
}
