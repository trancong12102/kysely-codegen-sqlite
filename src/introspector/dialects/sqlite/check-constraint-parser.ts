/**
 * Parses CHECK constraints from SQLite CREATE TABLE statements to extract
 * enum-like values.
 *
 * Supports patterns like:
 * - CHECK (column IN ('value1', 'value2', 'value3'))
 * - CHECK ("column" IN ('value1', 'value2'))
 * - CHECK (`column` IN ('value1', 'value2'))
 * - CHECK (column IN ("value1", "value2"))
 */

type CheckConstraintEnums = Record<string, string[]>;

/**
 * Extracts enum values from a CHECK constraint expression.
 * Returns null if the constraint doesn't match the IN pattern.
 */
const parseInConstraint = (
  expression: string,
): { column: string; values: string[] } | null => {
  // Match patterns like: column IN ('val1', 'val2') or "column" IN ('val1', 'val2')
  // Supports both single and double quotes for values, and optional quotes for column names
  // Using [\s\S]+ instead of .+ to match across newlines
  const inPattern = /^["'`]?(\w+)["'`]?\s+in\s*\(\s*([\S\s]+)\s*\)$/i;

  const match = expression.trim().match(inPattern);
  if (!match) {
    return null;
  }

  const column = match[1]!;
  const valuesString = match[2]!;

  // Parse the comma-separated values, handling quoted strings
  const values: string[] = [];
  let current = '';
  let inQuote = false;
  let quoteChar = '';
  let hasContent = false; // Track if we found quoted content

  for (let i = 0; i < valuesString.length; i++) {
    const char = valuesString[i]!;

    if (!inQuote && (char === "'" || char === '"')) {
      inQuote = true;
      quoteChar = char;
      hasContent = true; // Starting a quoted string
    } else if (inQuote && char === quoteChar) {
      // Check for escaped quote (doubled quote)
      if (valuesString[i + 1] === quoteChar) {
        current += char;
        i++; // Skip the escaped quote
      } else {
        inQuote = false;
        quoteChar = '';
      }
    } else if (!inQuote && char === ',') {
      if (hasContent) {
        values.push(current); // Don't trim - preserve spaces inside quotes
      }
      current = '';
      hasContent = false;
    } else if (inQuote) {
      current += char;
    }
  }

  // Add the last value
  if (hasContent) {
    values.push(current); // Don't trim - preserve spaces inside quotes
  }

  if (values.length === 0) {
    return null;
  }

  return { column, values };
};

/**
 * Extracts CHECK constraints from a CREATE TABLE statement.
 */
const extractCheckConstraints = (sql: string): string[] => {
  const constraints: string[] = [];

  // Match CHECK (...) patterns, handling nested parentheses
  const checkPattern = /check\s*\(/gi;
  let match;

  while ((match = checkPattern.exec(sql)) !== null) {
    const startIndex = match.index + match[0].length;
    let depth = 1;
    let endIndex = startIndex;

    // Find the matching closing parenthesis
    for (let i = startIndex; i < sql.length && depth > 0; i++) {
      if (sql[i] === '(') {
        depth++;
      } else if (sql[i] === ')') {
        depth--;
      }
      endIndex = i;
    }

    if (depth === 0) {
      const constraintBody = sql.slice(startIndex, endIndex).trim();
      constraints.push(constraintBody);
    }
  }

  return constraints;
};

/**
 * Parses a CREATE TABLE statement and extracts enum values from CHECK constraints.
 *
 * @param sql - The CREATE TABLE statement from sqlite_master
 * @returns A map of column names to their enum values
 */
export const parseCheckConstraints = (sql: string): CheckConstraintEnums => {
  const result: CheckConstraintEnums = {};

  if (!sql) {
    return result;
  }

  const constraints = extractCheckConstraints(sql);

  for (const constraint of constraints) {
    const parsed = parseInConstraint(constraint);
    if (parsed) {
      // Use lowercase column name for consistency
      const columnKey = parsed.column.toLowerCase();
      result[columnKey] = parsed.values;
    }
  }

  return result;
};
