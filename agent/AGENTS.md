# Roadmap Agent — minimal contract

- Read only relevant records: `npm run roadmap -- context WEB-001`.
- Send JSONL: first line `{"schema":"roadmap-intake/v1","batch":"unique-id","base":1,"source":"public-receipt-id"}`; subsequent lines `{"op":"patch","id":"WEB-001","set":{"descZh":"..."},"evidence":["https://github.com/..."]}`.
- `npm run roadmap -- intake change.jsonl` produces a **local private candidate**. It does not publish or edit the canonical snapshot.
- Do not invent dates, statuses, tests, source URLs or release decisions. Never export private GitHub links, raw internal evidence, credentials or internal task details to the public repository.
- The public site and public PRs are public. Private review and sanitization MUST happen before anything is committed to a public branch.
- Do not change `stage`, `start`, `end`, `deps`, `program` or `publicationStatus` via agent patch. A separate reviewed public decision is required.
- Missing field = unchanged; null unsupported in intake/v1. Repeated IDs in one batch rejected; stale base revision rejected. Candidates are not published automatically.
