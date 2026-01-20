import { deepStrictEqual } from 'node:assert';
import { ConnectionStringParser } from './connection-string-parser';

describe(ConnectionStringParser.name, () => {
  const parser = new ConnectionStringParser();

  describe('sqlite', () => {
    it('should parse connection strings correctly', () => {
      deepStrictEqual(
        parser.parse({
          connectionString: 'C:/Program Files/sqlite3/db',
        }),
        'C:/Program Files/sqlite3/db',
      );
      deepStrictEqual(
        parser.parse({
          connectionString: '/usr/local/bin',
        }),
        '/usr/local/bin',
      );
      deepStrictEqual(
        parser.parse({
          connectionString: ':memory:',
        }),
        ':memory:',
      );
    });
  });
});
