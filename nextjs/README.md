# Next.js LinkedIn feed

Use Node **22.23.4** or later. From this directory:

```sh
npm ci
cp .env.example .env.local
npm run dev
```

PowerShell: use `Copy-Item .env.example .env.local` instead of cp. Open the local URL printed by the server. The default is an explicit public demo, independent of customer credentials. For your feed set `PROFEED_MODE=customer` and supply both a feed ID and a secret server key. Missing or wrong key types produce a configuration error; they never silently fall back to demo.

Keep PROFEED*SECRET_KEY server-only, in a deployment/CI secret, never a NEXT_PUBLIC*, VITE* or PUBLIC* variable. Do not commit .env files.

## Checks and production

Run `npm test` and `npm run build`. Use npm start to serve the production build. Requests use no-store in a dynamic server component. The API already serves cached posts; an extra application cache adds staleness and must be scoped per account/feed. Never cache authorization failures or pending responses.

202 means collection pending even though HTTP considers it successful. 200 with no posts is a distinct empty state. 401 means invalid key; 403 can mean subscription, feed scope or origin; 429 means wait; 503 means unavailable. Cached stale posts may still be usable. Self-service paid feeds refresh on a three-hour schedule; application fetches do not force collection. Enterprise intervals are agreed separately.

This independent third-party service is not LinkedIn's official API. Connect only public company/showcase pages you own or are authorized to use. Personal profiles/private posts are unsupported.

[Full guide](https://headless.profeedwp.com/guides/nextjs-linkedin-feed) · [API quickstart](https://headless.profeedwp.com/docs) · [Authentication](https://headless.profeedwp.com/docs/authentication) · [OpenAPI](https://headless.profeedwp.com/openapi.json)

Root `npm run check -- nextjs` runs a fixture-backed production build and real browser checks without credentials. Root `npm run smoke:demo` separately checks the live public demo. Screenshots use authored sample data, not customer content.
