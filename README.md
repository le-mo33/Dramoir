# Dramoir — The Drama Shelf

Asian-drama discovery site: find your next watch by trope, mood and genre, and track titles in your own lists.

- Plan & decisions: [`docs/`](docs/) — start with [ARCHITECTURE](docs/ARCHITECTURE.md),
  [BUILD_PLAN](docs/BUILD_PLAN.md) and [DECISIONS](docs/DECISIONS.md).
- Content lives in the owner's Google Sheet; see [DATA_QUALITY_REPORT](docs/DATA_QUALITY_REPORT.md).

## Development
Requires Node 24 LTS and pnpm.

```bash
pnpm install
pnpm dev          # http://localhost:3000
pnpm lint && pnpm typecheck && pnpm test
```

Spike: `pnpm tsx scripts/spike-pinterest.ts` checks that the sheet's pin.it links resolve to images.
