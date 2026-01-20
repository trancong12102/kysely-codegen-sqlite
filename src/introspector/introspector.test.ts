import { type Kysely } from 'kysely';
import { deepStrictEqual } from 'node:assert';
import { migrate } from '../introspector/introspector.fixtures';
import { SqliteIntrospectorDialect } from './dialects/sqlite/sqlite-dialect';
import { Introspector } from './introspector';
import { ColumnMetadata } from './metadata/column-metadata';
import { DatabaseMetadata } from './metadata/database-metadata';
import { TableMetadata } from './metadata/table-metadata';

const testValues = async (
  db: Kysely<any>,
  inputValues: Record<string, unknown>,
  outputValues: Record<string, unknown>,
) => {
  await db.insertInto('fooBar').values(inputValues).execute();

  const row = await db
    .selectFrom('fooBar')
    .selectAll()
    .executeTakeFirstOrThrow();

  for (const [key, expectedValue] of Object.entries(outputValues)) {
    const actualValue = row[key];
    deepStrictEqual(actualValue, expectedValue);
  }
};

describe(Introspector.name, () => {
  it('should return the correct metadata for SQLite', async () => {
    const dialect = new SqliteIntrospectorDialect();
    const connectionString = ':memory:';
    const inputValues = { false: 0, id: 1, true: 1 };
    const outputValues = { false: 0, id: 1, true: 1 };

    const db = await migrate(dialect, connectionString);
    await testValues(db, inputValues, outputValues);
    const metadata = await dialect.introspector.introspect({ db });

    deepStrictEqual(
      metadata,
      new DatabaseMetadata({
        tables: [
          new TableMetadata({
            columns: [
              new ColumnMetadata({
                dataType: 'boolean',
                name: 'false',
              }),
              new ColumnMetadata({
                dataType: 'boolean',
                name: 'true',
              }),
              new ColumnMetadata({
                dataType: 'TEXT',
                isNullable: true,
                name: 'overridden',
              }),
              new ColumnMetadata({
                dataType: 'INTEGER',
                isAutoIncrementing: true,
                name: 'id',
              }),
              new ColumnMetadata({
                dataType: 'TEXT',
                isNullable: true,
                name: 'user_status',
              }),
            ],
            name: 'foo_bar',
          }),
        ],
      }),
    );
  });
});
