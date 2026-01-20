import { deepStrictEqual } from 'node:assert';
import { parseCheckConstraints } from './check-constraint-parser';

describe('parseCheckConstraints', () => {
  test('should parse simple CHECK IN constraint with single quotes', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      status TEXT CHECK (status IN ('public', 'private', 'restricted')) NOT NULL
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['public', 'private', 'restricted'],
    });
  });

  test('should parse CHECK IN constraint with double quotes', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      status TEXT CHECK (status IN ("public", "private")) NOT NULL
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['public', 'private'],
    });
  });

  test('should parse CHECK IN constraint with quoted column name', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      "status" TEXT CHECK ("status" IN ('active', 'inactive')) NOT NULL
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should parse CHECK IN constraint with backtick-quoted column name', () => {
    const sql = `CREATE TABLE example (
      \`status\` TEXT CHECK (\`status\` IN ('active', 'inactive')) NOT NULL
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should parse multiple CHECK constraints', () => {
    const sql = `CREATE TABLE users (
      id INTEGER PRIMARY KEY,
      status TEXT CHECK (status IN ('active', 'inactive')),
      role TEXT CHECK (role IN ('admin', 'user', 'guest'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      role: ['admin', 'user', 'guest'],
      status: ['active', 'inactive'],
    });
  });

  test('should handle table-level CHECK constraint', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      status TEXT NOT NULL,
      CHECK (status IN ('public', 'private'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['public', 'private'],
    });
  });

  test('should return empty object for no CHECK constraints', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      name TEXT NOT NULL
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {});
  });

  test('should return empty object for non-IN CHECK constraints', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      age INTEGER CHECK (age > 0)
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {});
  });

  test('should handle empty sql', () => {
    const result = parseCheckConstraints('');
    deepStrictEqual(result, {});
  });

  test('should handle values with escaped quotes', () => {
    const sql = `CREATE TABLE example (
      id INTEGER PRIMARY KEY,
      message TEXT CHECK (message IN ('it''s ok', 'hello'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      message: ["it's ok", 'hello'],
    });
  });

  test('should handle case-insensitive CHECK and IN keywords', () => {
    const sql = `CREATE TABLE example (
      status TEXT check (status in ('active', 'inactive'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should normalize column names to lowercase', () => {
    const sql = `CREATE TABLE example (
      "Status" TEXT CHECK ("Status" IN ('active', 'inactive'))
    )`;

    const result = parseCheckConstraints(sql);

    // Column name should be lowercase in result
    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  // Edge cases

  test('should handle values with spaces', () => {
    const sql = `CREATE TABLE tasks (
      status TEXT CHECK (status IN ('in progress', 'on hold', 'done'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['in progress', 'on hold', 'done'],
    });
  });

  test('should handle empty string values', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status IN ('', 'active', 'inactive'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['', 'active', 'inactive'],
    });
  });

  test('should handle numeric-looking string values', () => {
    const sql = `CREATE TABLE example (
      code TEXT CHECK (code IN ('001', '002', '003'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      code: ['001', '002', '003'],
    });
  });

  test('should handle column names with underscores', () => {
    const sql = `CREATE TABLE users (
      user_status TEXT CHECK (user_status IN ('active', 'banned'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      user_status: ['active', 'banned'],
    });
  });

  test('should handle single value in IN clause', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status IN ('only_one'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['only_one'],
    });
  });

  test('should handle extra whitespace', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (   status   IN   (   'active'  ,  'inactive'   )   )
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should handle newlines in constraint', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (
        status IN (
          'active',
          'inactive',
          'pending'
        )
      )
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['active', 'inactive', 'pending'],
    });
  });

  test('should handle values with special characters', () => {
    const sql = `CREATE TABLE example (
      type TEXT CHECK (type IN ('type:a', 'type:b', 'type-c'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      type: ['type:a', 'type:b', 'type-c'],
    });
  });

  test('should handle values with parentheses inside quotes', () => {
    const sql = `CREATE TABLE example (
      label TEXT CHECK (label IN ('(none)', 'value (1)', 'normal'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      label: ['(none)', 'value (1)', 'normal'],
    });
  });

  test('should handle values with commas inside quotes', () => {
    const sql = `CREATE TABLE example (
      name TEXT CHECK (name IN ('last, first', 'single'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      name: ['last, first', 'single'],
    });
  });

  test('should ignore NOT IN constraints', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status NOT IN ('banned', 'deleted'))
    )`;

    const result = parseCheckConstraints(sql);

    // NOT IN should not be parsed as enum values
    deepStrictEqual(result, {});
  });

  test('should handle named constraints with CONSTRAINT keyword', () => {
    const sql = `CREATE TABLE example (
      status TEXT,
      CONSTRAINT status_check CHECK (status IN ('active', 'inactive'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should handle complex constraint with additional conditions (AND)', () => {
    // Only the IN part should be extracted if it's the first part
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status IN ('active', 'inactive') AND length(status) > 0)
    )`;

    const result = parseCheckConstraints(sql);

    // This won't match because of the AND clause - that's expected behavior
    deepStrictEqual(result, {});
  });

  test('should handle unicode values', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status IN ('активный', 'неактивный'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['активный', 'неактивный'],
    });
  });

  test('should handle emoji values', () => {
    const sql = `CREATE TABLE reactions (
      emoji TEXT CHECK (emoji IN ('👍', '👎', '❤️'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      emoji: ['👍', '👎', '❤️'],
    });
  });

  test('should handle mixed CHECK constraint types (IN and other)', () => {
    const sql = `CREATE TABLE example (
      age INTEGER CHECK (age > 0),
      status TEXT CHECK (status IN ('active', 'inactive')),
      score INTEGER CHECK (score >= 0 AND score <= 100)
    )`;

    const result = parseCheckConstraints(sql);

    // Only the IN constraint should be extracted
    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should handle values with backslashes', () => {
    // SQLite doesn't use backslash escaping - backslashes are stored as-is
    const sql = `CREATE TABLE example (
      path TEXT CHECK (path IN ('C:\\Users', '/home/user'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      path: ['C:\\Users', '/home/user'],
    });
  });

  test('should handle multiple escaped quotes in same value', () => {
    const sql = `CREATE TABLE example (
      quote TEXT CHECK (quote IN ('it''s a ''test''', 'normal'))
    )`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      quote: ["it's a 'test'", 'normal'],
    });
  });

  test('should handle constraint immediately after column definition', () => {
    const sql = `CREATE TABLE t(status TEXT CHECK(status IN('a','b')))`;

    const result = parseCheckConstraints(sql);

    deepStrictEqual(result, {
      status: ['a', 'b'],
    });
  });

  test('should handle case variations in column name within constraint', () => {
    // Column defined as lowercase, but CHECK uses uppercase
    const sql = `CREATE TABLE example (
      status TEXT CHECK (STATUS IN ('active', 'inactive'))
    )`;

    const result = parseCheckConstraints(sql);

    // Should normalize to lowercase
    deepStrictEqual(result, {
      status: ['active', 'inactive'],
    });
  });

  test('should not extract from subquery-like patterns', () => {
    // This is edge case - if someone writes something that looks like a subquery
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status IN (SELECT value FROM statuses))
    )`;

    const result = parseCheckConstraints(sql);

    // Should not match because values don't look like quoted strings
    deepStrictEqual(result, {});
  });

  test('should handle values with leading/trailing spaces inside quotes', () => {
    const sql = `CREATE TABLE example (
      status TEXT CHECK (status IN (' active ', 'inactive'))
    )`;

    const result = parseCheckConstraints(sql);

    // Spaces inside quotes should be preserved
    deepStrictEqual(result, {
      status: [' active ', 'inactive'],
    });
  });
});
