# Contributor and AI assistant instructions

Each example is independently installable. Preserve its lockfile and exact tested framework versions. Use Node 22.23.4 or later.
Run npm ci in the root and changed example, npm test inside the example, and npm run check -- EXAMPLE in the root. Fixtures are authored and credential-free; the separate smoke:demo command uses the network.
Keep server keys out of browser-prefixed environment variables, HTML, logs and bundles. Never silently fall back from customer mode to demo. Check 202 before response.ok. Respect Retry-After. Render text as text and validate links.
Do not add customer data, third-party media or marketing/backend source. All contributed code is MIT, copyright Accomplice AB. Update the guide links, README and screenshot provenance when behavior changes. The website imports an allowlisted pinned snapshot, not live files from GitHub.
