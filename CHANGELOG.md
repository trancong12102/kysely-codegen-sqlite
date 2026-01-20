# kysely-codegen-sqlite

## 0.2.0

### Minor Changes

- dd3ebbe: Remove dialect selection feature for SQLite-only simplification
  - Remove `--dialect` CLI flag
  - Remove `dialect` option from config
  - Remove `DialectName` type and `dialectNameSchema`
  - Remove `VALID_DIALECTS` constant
  - Simplify `getDialect()` to return SQLite dialect directly
  - Simplify `ConnectionStringParser` to return connection string only

## 0.1.5

### Patch Changes

- 750c7b7: Use changeset publish for automatic GitHub releases

## 0.1.4

### Patch Changes

- 1ce23a6: Fix GitHub release to include changelog content

## 0.1.3

### Patch Changes

- f2007b3: Verify GitHub release creation in release workflow

## 0.1.2

### Patch Changes

- 5522e08: Test release workflow with GitHub release creation

## 0.1.1

### Patch Changes

- b4de371: Initial release of kysely-codegen-sqlite - a SQLite-focused fork of kysely-codegen for generating TypeScript types from SQLite databases.
