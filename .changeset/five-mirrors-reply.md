---
"kysely-codegen-sqlite": minor
---

Remove dialect selection feature for SQLite-only simplification

- Remove `--dialect` CLI flag
- Remove `dialect` option from config
- Remove `DialectName` type and `dialectNameSchema`
- Remove `VALID_DIALECTS` constant
- Simplify `getDialect()` to return SQLite dialect directly
- Simplify `ConnectionStringParser` to return connection string only
