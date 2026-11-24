# PROTORHEXIS Public Roadmap

Site: https://protorhexis.com/roadmap/  |  API: https://protorhexis.com/api/roadmap/v1.json

## Data source

Markdown/YAML records in `src/content/roadmap/` compile into one public snapshot consumed by the Gantt, board, timeline, system map and JSON API. Scheduled updates follow [the current agent policy](agent/AGENTS.md). Historical observation windows are distinct from delivery dates; Future stays undated.

### Human / Agent authoring
- Human-friendly Markdown frontmatter/YAML and VS Code Front Matter config (`frontmatter.json`).
- Unified Zod contracts: `src/lib/roadmap-content-schema.mjs`, reused by `src/content.config.ts` Astro Content Collections.
- `npm run roadmap:new -- --kind work --id WEB-XXX` creates a draft source file (validation still required).
- `npm run roadmap:context -- --id WEB-SITE-005` gives an Agent one compact object and revision hash.
- `npm run roadmap:intake -- --input changes.jsonl` only validates and summarizes; `--stage` writes a git-ignored local/private candidate, never a published change.
- `npm run roadmap:compile` builds the public snapshot. `npm run roadmap:validate` checks the generated data is up to date.
- Static read-only public endpoint `/api/roadmap/v1.json` is built at the same time.

All public source links are explicitly allowlisted; no private repository paths or tokens may enter this site or its public Pull Requests, including Draft PRs. Real engineering details require **independent source approval and sanitization before entering this public repository**. See [V3.1 content pipeline](docs/ROADMAP-V3.1-CONTENT-PIPELINE.md) and [Agent instructions](agent/AGENTS.md).

### Build and validation

```sh
npm install
npm run build
npm run check:roadmap
npm run check:site
npm run check:fonts
npm run check:gantt
npx playwright install chromium
npm run test:e2e
```

`build` compiles the snapshot automatically. `check:roadmap` validates the compiled data and candidate intake; Gantt tests exercise the geometry directly. Playwright checks actual desktop and mobile behavior.

GitHub Actions runs source, schema, build and desktop/mobile Chromium Hydration checks before deploying `main` to Pages. A PR validation never publishes the site. No Page.js browser token or write API exists. `src/data/roadmap.generated.json` is generated, so don't edit it by hand.

### Views
- `/roadmap/` read-only Gantt; no invented future dates; unknown schedules appear as undated items.
- `/roadmap/board/` current *public* work phases, not private Issue states.
- `/roadmap/evidence/` recorded public events with cited external sources in the inspector.
- `/roadmap/systems/` public index. No unreviewed integration edges are drawn.

Frontend: Astro 7 + Vue 3 + TypeScript + Vue Flow + Motion for Vue. Preserve full-width graphite/coral UI, Iconify material line icons, accessible controls, reduced-motion, continuous corners and **no shadows**. Deployment is GitHub Pages at `protorhexis.com`. The unfinished institutional home remains separate.


### V3.2 Future and private-source progress
The board has a separate undated Future phase for brief plans. Four **reviewed and sanitized** high-level project progress summaries are public, referenced by opaque receipt IDs. Their original private sources and review evidence remain protected. New unapproved progress candidates must not appear even on public Draft branches. Agent work-item append goes to ignored local candidate staging; it cannot approve publication. See the V3.2 addendum to the content pipeline document.
