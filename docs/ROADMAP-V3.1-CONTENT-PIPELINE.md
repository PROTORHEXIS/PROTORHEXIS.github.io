# Roadmap V3.1 — git-native, schema-first public data

**Scope**: public site content pipeline and agent candidate adapter. This is **not** an implementation of internal TALOS, MAXWELL or TIC/TIR ingestion.

## Authority / evidence
- `src/content/roadmap/{programs,work-items,updates,relations}` is the approved-public source. Local Markdown frontmatter/YAML are easy to edit in GitHub or the VS Code Front Matter extension.
- `src/lib/roadmap-content-schema.mjs` is the common Zod schema. `src/content.config.ts` also applies it to Astro collections.
- `scripts/roadmap-cli.mjs compile` validates IDs, cross-references, schedule semantics, source allowlists, cycles, approved-only publication and generates `src/data/roadmap.generated.json`. `public /api/roadmap/v1.json` is a prerendered **read-only** endpoint.
- All four workstation views read the same generated snapshot, never private GitHub APIs at runtime.
- `schedule.kind = observed` is a **public PR observation window**, not a start-to-finish engineering claim, future forecast or release promise. A missing date MUST be represented as `schedule: null`.
- `published` means a specific cited *public website deliverable* was merged/deployed, never a claim about a private ecosystem product. `planned` means an explicitly noncommitted direction. `APPROVED_PUBLIC_SNAPSHOT` means publication review only, not production qualification.

## Agent interface / human authoring
- `npm run roadmap:new -- --kind work --id WEB-NEW-001` generates a draft Markdown file; fill its Frontmatter, description and evidence, then review before marking approved.
- `npm run roadmap:context -- --id WEB-SITE-005` emits the compact target and content hash.
- JSONL header includes `schema`, `batch`, `source`; `patch` includes `id`, `base`, `set`, and `evidence`. `append` carries a full event/relation. Each operation is schema checked. Only declared patchable fields are allowed; publication state is **never** writable by Agent. Duplicate IDs and stale base revisions fail closed.
- `npm run roadmap:intake -- --input changes.jsonl [--stage]` produces a local/private candidate; it does NOT change any content document or the live site. Replaying a staged batch with the same digest is idempotent, a different payload with the same batch fails. `.roadmap-candidates/` is Git ignored.
- Any private-source intake runs in a separate protected clone/staging workspace. Don't put raw private evidence in public repo issues, code, actions, PR, artifacts, logs or comments. The public exporter currently accepts only expressly reviewed `PROTORHEXIS/.github` and `PROTORHEXIS/PROTORHEXIS.github.io` GitHub links and `protorhexis.com`.

## Build / release
```
npm install
npm run roadmap:compile
npm run roadmap:validate
npm run check:roadmap
npm run check:fixtures
npm run build # also compiles roadmap automatically
npm run test:e2e
```

Actual public provenance in first snapshot: organization README and site PR #1, #4, #5 and #9, associated site deployment workflows. No internal status from private repos is published. Other four system names are only public index entries, with zero work items and no invented graph edges or deadlines.

## Future integration
`roadmap-intake/v1` is a local file contract for future MAXWELL/TIC/TIR adapters. The interface **does not** expose a network write endpoint, grant publish rights, promise automatic sync, or make private systems accessible to browser JS. Extend through a separately reviewed authorization and sanitization adapter; new public sources need a deliberate allowlist change.


## V3.2 — controlled private-source candidate and Future board

**Protected flow:** authorized private repository evidence → private reviewer ledger → Agent emits minimal sanitized `append kind=work` JSONL → `roadmap:intake --stage` (git-ignored candidate) → private reviewer verifies exact source revision, wording, disclosure scope, and `PUB-RM-*` receipt → human-authored Markdown/YAML public source → public Draft PR / exact-head build and browser check → separate merge/deploy authorization.

The public repository must contain no private evidence links, source SHA, secrets, raw logs, or potentially exploitable security details. Public records can hold only an opaque `reviewReceipt`, with source mapping and actual reviewer decision stored privately. **Important:** receipt format validation alone does NOT prove approval because CI cannot read the private ledger. Do not call a self-asserted receipt independently verified. Human review of the private ledger is a necessary fail-closed release step.

The four initial private-project updates are staged as `publication: draft`; they are not present in the published JSON pending source/wording review. Future uses an independent `phase: future` value, `schedule: null`, short bilingual descriptions and no implied committed delivery or existing implementation. Future appears on the board but is excluded from dated Gantt planning. Agent intake of new work is candidate-only and cannot issue its own receipt or mark itself approved.

The file-based process supports reviewable real progress candidates now. It does NOT implement automatic source polling, webhook authenticity, source-checkout authorization, signing, remote event delivery or automatic synchronization; these can be connected through a later approved MAXWELL adapter without changing the public write boundary.
