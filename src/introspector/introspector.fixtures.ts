import { CamelCasePlugin, Kysely, sql } from 'kysely';
import assert from 'node:assert';
import { IntrospectorDialect } from './dialect';

const down = async (db: Kysely<any>, dialect: IntrospectorDialect) => {
  assert(dialect instanceof IntrospectorDialect);

  await db.schema.dropTable('boolean').ifExists().execute();
  await db.schema.dropTable('foo_bar').ifExists().execute();
};

const up = async (db: Kysely<any>, dialect: IntrospectorDialect) => {
  assert(dialect instanceof IntrospectorDialect);

  await down(db, dialect);

  const builder = db.schema
    .createTable('foo_bar')
    .addColumn('false', 'boolean', (col) => col.notNull())
    .addColumn('true', 'boolean', (col) => col.notNull())
    .addColumn('overridden', sql`text`)
    .addColumn('id', 'integer', (col) =>
      col.autoIncrement().notNull().primaryKey(),
    )
    .addColumn('user_status', 'text');

  await builder.execute();
};

export const addExtraColumn = async (db: Kysely<any>) => {
  await db.schema
    .alterTable('foo_bar')
    .addColumn('user_name', 'varchar(50)', (col) => col.defaultTo('test'))
    .execute();
};

export const migrate = async (
  dialect: IntrospectorDialect,
  connectionString: string,
) => {
  const db = new Kysely<any>({
    dialect: await dialect.createKyselyDialect({ connectionString }),
    plugins: [new CamelCasePlugin()],
  });

  await up(db, dialect);

  return db;
};
