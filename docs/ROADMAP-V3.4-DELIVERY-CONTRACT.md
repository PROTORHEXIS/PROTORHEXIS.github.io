# Roadmap V3.4: Progress and Delivery Separation

The state dimensions are **not interchangeable**:

- `phase` — what kind of development activity is publicly described
- `publication:approved` — whether the particular sanitized text was allowed onto the public website
- `delivery.state` — independent release status: `unassigned`, `tentative`, `committed`, or `released`
- `delivery.target` — named target (mandatory for tentative/committed), not inferred from timeline
- `delivery.gateReceipt` — independently authorized release Gate proof (mandatory for committed and non-site product release)
- `verifiedAt` — independently approved last source verification, `null` when unknown; `updatedAt` is only the publication record revision date
- `schedule.kind:observed` — a historic source-linked observation window, NOT actual engineering effort, product completion, or a deadline.

Initial migration is non-promotional: four private-source engineering summaries, six Future cards and one undated website candidate remain `delivery.state=unassigned`; four evidenced public **site** artifacts already marked `phase:published` become `released` **only as website artifacts**, not as TALOS/MAXWELL/THOULESS/TESSERACT product releases. Every `verifiedAt` remains null until separate evidence is reviewed.

`npm run roadmap:roundup -- --since YYYY-MM-DD` produces a reproducible Markdown roundup from **already-approved public events and their citations**; if a reviewed event has a `change` object, output the previous value, next value and bilingual reason. No artificial change or reason is introduced for old events. It is a read-only generator, not a private-source poller or autonomous publisher.

Agent `roadmap-intake/v1` remains candidate-only. No agent patch may edit delivery, verification, publication or issue a private review receipt. Appended work candidates may only declare `delivery.state:unassigned` and `verifiedAt:null`. New external release facts still need separate release Gate evidence, redaction approval, website PR and validation. There is no new write API.
