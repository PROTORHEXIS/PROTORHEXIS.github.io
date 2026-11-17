# Roadmap V3.1 — source-verified publication and agent intake

## Publication status

The visible engineering workstation is now fed by `content/roadmap/public.json` (public GitHub-backed **website work only**). TALOS, MAXWELL, THOULESS and TESSERACT synthetic items were removed from the displayed schedule/board/timeline. This is NOT evidence that their internal work is complete or publicly authorized. No speculative future schedule is shown. The static conceptual system diagram is not a verified integration topology.

The website repo is public. A public PR is not a safe place for internal review. Source authorization/sanitization happens privately **before** public commits. The current sample public source facts were read from the public PR list in `PROTORHEXIS/PROTORHEXIS.github.io`, with merged dates and commit IDs checked against GitHub. Each public item and event has a public source URL. No private TALOS evidence was copied.

## Data pipeline

- Canonical published snapshot: `content/roadmap/public.json` (`public-roadmap/v1`); **read-only** in the client.
- UI adapter: `src/data/public-roadmap.ts` converts the reviewed content to the legacy typed workbench shape without importing synthetic data.
- `npm run roadmap -- validate` checks ID uniqueness, program membership, date windows, references and public GitHub evidence.
- `npm run roadmap -- context WEB-003` emits only the requested record and minimal edit fields.
- `npm run roadmap -- intake agent/example.jsonl` writes a **non-published candidate** to gitignored `private-candidates/`. It cannot alter the canonical snapshot or trigger Pages.
- `roadmap-intake/v1`: header `{schema,batch,base,source}` then JSONL `patch` lines `{op,id,set,evidence}`. v1 permits descriptive text and evidence only. Stale revision, unknown IDs, invalid evidence, forbidden status/schedule changes and duplicate patches fail closed.
- Only a separately reviewed human publication step may update canonical public content and increase its revision. CI validates the content and builds Astro; it does not have private repo access.

## Future automation interface

Adapters may produce `roadmap-intake/v1` JSONL from a private source, but **never** publish automatically. A private review workflow may generate a sanitized candidate, perform an explicit release decision, then submit the public-only snapshot as a PR. Candidate batch IDs and source IDs should be unique for idempotence. Add persistent receipt tracking and release signatures before enabling unattended automation.

## Important limitations

- This is a minimal file-based pipeline, not a production CMS. No automated GitHub source synchronization, secret scanning service, approval UI, revision store or content translation service has been deployed.
- `roadmap-intake/v1` supports patch-only, not create/delete/clear. It intentionally rejects direct status/date changes.
- Exact engineering progress for private systems is not published until separately approved, evidence-backed public summaries are available. Missing facts remain absent, not fabricated.
- Historical work windows show publicly verified PR activity, not future release commitments.
- The public workstation remains `noindex` until full content governance and publication authorization are reviewed.
