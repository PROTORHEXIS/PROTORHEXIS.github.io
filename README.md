# PROTORHEXIS Public Roadmap — Engineering Workstation V3.1

Site: https://protorhexis.com/roadmap/  |  API: https://protorhexis.com/api/roadmap/v1.json

## Contents are source-reviewed, not synthetic
The website previously used `src/data/workstation-demo.ts`, a fictional UI fixture. V3.1 **replaces it** with reviewed public content records under `src/content/roadmap/{programs,work-items,updates,relations}/` and a statically compiled snapshot at `src/data/roadmap.generated.json`.

Published history is limited to publicly verifiable website PRs and builds. The TALOS/MAXWELL/THOULESS/TESSERACT index entries **do not** imply public delivery status, real API dependency topology, production readiness or dates. Date ranges marked `observed` are public PR windows, not plans or release commitments. Unpublished schedules stay `null`. Future automated ingestion is not implemented yet.

### Human / Agent authoring
- Human-friendly Markdown frontmatter/YAML and VS Code Front Matter config (`frontmatter.json`).
- Unified Zod contracts: `src/lib/roadmap-content-schema.mjs`, reused by `src/content.config.ts` Astro Content Collections.
- `npm run roadmap:new -- --kind work --id WEB-XXX` creates a draft source file (validation still required).
- `npm run roadmap:context -- --id WEB-SITE-005` gives an Agent one compact object and revision hash.
- `npm run roadmap:intake -- --input changes.jsonl` only validates and summarizes; `--stage` writes a git-ignored local/private candidate, never a published change.
- `npm run roadmap:compile` builds the public snapshot. `npm run roadmap:validate` checks the generated data is up to date.
- Static read-only public endpoint `/api/roadmap/v1.json` is built at the same time.

All public source links are explicitly allowlisted; no private repository paths or tokens may enter this site or its public Pull Requests, including Draft PRs. Real engineering details require **independent source approval and sanitization before entering this public repository**. See [V3.1 content pipeline](docs/ROADMAP-V3.1-CONTENT-PIPELINE.md) and [Agent instructions](agent/AGENTS.md).

### Release gate
```
npm install
npm run roadmap:compile
npm run roadmap:validate
npm run check:roadmap
npm run check:fixtures
npm run check:style
npm run check:gantt
npm run check:layers
npm run check:v25
npm run check:v26
npm run check:v29
npm run check:v30
npm run build
npm run test:e2e
```
GitHub Actions runs source, schema, build and desktop/mobile Chromium Hydration checks before deploying `main` to Pages. A PR validation never publishes the site. No Page.js browser token or write API exists. `src/data/roadmap.generated.json` is generated, so don't edit it by hand.

### Views
- `/roadmap/` read-only Gantt; no invented future dates; unknown schedules appear as undated items.
- `/roadmap/board/` current *public* work phases, not private Issue states.
- `/roadmap/evidence/` recorded public events with cited external sources in the inspector.
- `/roadmap/systems/` public index. No unreviewed integration edges are drawn.

Frontend: Astro 7 + Vue 3 + TypeScript + Vue Flow + Motion for Vue. Preserve full-width graphite/coral UI, Iconify material line icons, accessible controls, reduced-motion, continuous corners and **no shadows**. Deployment is GitHub Pages at `protorhexis.com`. The unfinished institutional home remains separate.


### V3.2 Future and private-source progress
The board has a separate undated Future phase for brief plans. Four narrowly scoped private-project progress proposals remain **only in the protected private review ledger**; an unapproved progress record must not appear even in a public Draft branch. Agent work-item append goes to ignored local candidate staging; it cannot approve publication. See the V3.2 addendum to the content pipeline document.
