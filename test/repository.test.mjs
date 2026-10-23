import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
test("all examples have explicit demo templates and pinned dependencies", async () => {
  for (const name of ["nextjs", "react", "vanilla", "astro"]) {
    const env = await readFile(
      new URL("../" + name + "/.env.example", import.meta.url),
      "utf8",
    );
    assert(env.includes("PROFEED_MODE=demo"));
    const pkg = JSON.parse(
      await readFile(new URL("../" + name + "/package.json", import.meta.url)),
    );
    assert.equal(pkg.engines.node, ">=22.23.4");
    assert(
      await readFile(
        new URL("../" + name + "/package-lock.json", import.meta.url),
      ),
    );
  }
});
