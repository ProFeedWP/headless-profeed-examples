# Plain JavaScript LinkedIn feed

## Six feed designs for AI website projects

Open `/layouts/index.html?layout=card-grid` after starting the dev server to explore the sample-only gallery. Supported layouts: `card-grid`, `news-list`, `featured-update`, `image-gallery`, `dark-carousel`, and `company-timeline`. These previews use authored posts and SVG artwork; they never read credentials or call a feed API. The state selector lets you try empty, pending, missing-field and failure examples. Carousel controls support keyboard and touch navigation, with no auto-rotation.

Open `/layouts/connected.html?layout=card-grid` to use the same renderer with the explicit demo/customer configuration below. It calls the existing `readFeed` helper and passes its normalized result to `renderLayout`; missing customer settings remain an error. The default `/` example remains available.

The six design prompts live in `layouts/designs.json`. Complete prompts combine `layouts/shared-prompt.txt` with the selected design's `prompt`. Follow-up prompts refine the design after the initial integration. These are platform-neutral reference implementations, not claimed outputs from a particular AI builder. [Guide, prompts, and previews](https://headless.profeedwp.com/guides/ai-website-linkedin-feed).

Use Node **22.23.4** or later. From this directory:

```sh
npm ci
cp .env.example .env
npm run dev
```

PowerShell: use `Copy-Item .env.example .env` instead of cp. Open the local URL printed by the server. The default is an explicit public demo, independent of customer credentials. For your feed set `VITE_PROFEED_MODE=customer` and supply both a feed ID and a publishable browser key. Missing or wrong key types produce a configuration error; they never silently fall back to demo.

Create a read-only publishable key scoped to this feed and the EXACT local origin (scheme, host and port), then add your production origin before deploying. Publishable keys are visible to visitors; never put a secret key in a VITE\_ variable. Origin restrictions are not confidentiality.

## Checks and production

Run `npm test` and `npm run build`. Use npm run preview to serve dist/. Requests happen in the browser. Cleanup aborts in-flight requests; retry buttons honor the API Retry-After interval. They do not busy-poll the API.

202 means collection pending even though HTTP considers it successful. 200 with no posts is a distinct empty state. 401 means invalid key; 403 can mean subscription, feed scope or origin; 429 means wait; 503 means unavailable. Cached stale posts may still be usable. Self-service paid feeds refresh on a three-hour schedule; application fetches do not force collection. Enterprise intervals are agreed separately.

This independent third-party service is not LinkedIn's official API. Connect only public company/showcase pages you own or are authorized to use. Personal profiles/private posts are unsupported.

[Full guide](https://headless.profeedwp.com/guides/linkedin-company-posts-api) · [API quickstart](https://headless.profeedwp.com/docs) · [Authentication](https://headless.profeedwp.com/docs/authentication) · [OpenAPI](https://headless.profeedwp.com/openapi.json)

Root `npm run check -- vanilla` runs a fixture-backed production build and real browser checks without credentials. Root `npm run smoke:demo` separately checks the live public demo. Screenshots use authored sample data, not customer content.
