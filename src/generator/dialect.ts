import type { DialectName } from '../cli/config';
import { IntrospectorDialect } from '../introspector/dialect';
import type { Adapter } from './adapter';
import { SqliteDialect } from './dialects/sqlite/sqlite-dialect';

/**
 * A Dialect is the glue between the codegen and the specified database.
 */
export abstract class GeneratorDialect extends IntrospectorDialect {
  abstract readonly adapter: Adapter;
}

export const getDialect = (_name: DialectName): GeneratorDialect => {
  return new SqliteDialect();
};
