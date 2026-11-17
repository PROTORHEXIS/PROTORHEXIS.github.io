# ROADMAP-DATA-AGENT-001 / v1

Goal: submit minimal reviewed-public-candidate changes. **Never edit `src/data/roadmap.generated.json` manually.**

1. `npm run roadmap:context -- --id WEB-SITE-005` -> one target plus `base` hash. Do not read entire repo for a one-field update.
2. Emit JSONL: header `{ "schema":"roadmap-intake/v1", "batch":"unique-id", "source":"source-ledger-ref" }`; then one `patch` per ID with `base`, `set`, nonempty `evidence` (sources), or an `append` for a new update.
3. `npm run roadmap:intake -- --input changes.jsonl` validates. `--stage` saves a *private, ignored* candidate file; it never publishes or edits content.
4. Do not change `publication`, source repo identities, reviewed title, or scheduled commitments via Agent patches. Do not infer completion from `PASS`, a closed Issue or a merged PR. Omitted field = leave unchanged; `null` = clear if schema permits.
5. Keep all private evidence in a separate access-controlled intake workspace. A public PR is public **even in Draft**. Submit only an independently approved, sanitized public record via the Markdown/YAML content authoring path.
6. Do not mention private repo paths, secrets, exact internal commits, staff or tenant records in public output. No dates without a verified public planning decision. If no source, submit nothing.

Agent example: see `agent/example.jsonl`. Full contract: `docs/ROADMAP-V3.1-CONTENT-PIPELINE.md`.

## Private progress and Future (V3.2)
- Evidence from private projects stays in an access-controlled source ledger. Never copy private URLs, exact internal commits, raw logs or security diagnostics into a public PR, including Draft.
- Use `roadmap-intake/v1` with `append kind=work` for sanitized work summaries. `intake --stage` writes an ignored local candidate, not public source or an API write.
- Agent must NOT set `publication` or `reviewReceipt`. A qualified reviewer privately checks exact evidence and authorizes a specific minimal text and receipt. Public PR review is a separate gate.
- Future is `phase: future`, `schedule: null`, and a concise aspiration (no dates, fake percentages, or inferred production stage). Avoid repeating long descriptions.
- Publication approval is not a CI PASS; a receipt ID is only an opaque pointer to the protected source-review ledger, never cryptographic proof.
