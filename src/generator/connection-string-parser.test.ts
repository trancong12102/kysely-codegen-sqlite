import { deepStrictEqual } from 'node:assert';
import { ConnectionStringParser } from './connection-string-parser';

describe(ConnectionStringParser.name, () => {
  const parser = new ConnectionStringParser();

  describe('sqlite', () => {
    it('should infer the correct dialect name', () => {
      deepStrictEqual(
        parser.parse({
          connectionString: 'C:/Program Files/sqlite3/db',
        }),
        {
          connectionString: 'C:/Program Files/sqlite3/db',
          dialect: 'sqlite',
        },
      );
      deepStrictEqual(
        parser.parse({
          connectionString: '/usr/local/bin',
        }),
        {
          connectionString: '/usr/local/bin',
          dialect: 'sqlite',
        },
      );
      deepStrictEqual(
        parser.parse({
          connectionString: ':memory:',
        }),
        {
          connectionString: ':memory:',
          dialect: 'sqlite',
        },
      );
    });
  });
});
