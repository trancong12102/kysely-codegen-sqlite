import { sql } from 'kysely';
import { EnumCollection } from '../../enum-collection';
import type { IntrospectOptions } from '../../introspector';
import { Introspector } from '../../introspector';
import { ColumnMetadata } from '../../metadata/column-metadata';
import { DatabaseMetadata } from '../../metadata/database-metadata';
import { TableMetadata } from '../../metadata/table-metadata';
import { parseCheckConstraints } from './check-constraint-parser';

type SqliteMasterRow = {
  name: string;
  sql: string | null;
};

export class SqliteIntrospector extends Introspector<any> {
  /**
   * Fetches CREATE TABLE statements from sqlite_master for all tables.
   */
  private async getTableSchemas(
    options: IntrospectOptions<any>,
  ): Promise<Map<string, string>> {
    const result = await sql<SqliteMasterRow>`
      SELECT name, sql FROM sqlite_master
      WHERE type = 'table' AND name NOT LIKE 'sqlite_%'
    `.execute(options.db);

    const schemas = new Map<string, string>();
    for (const row of result.rows) {
      if (row.sql) {
        schemas.set(row.name, row.sql);
      }
    }
    return schemas;
  }

  async introspect(options: IntrospectOptions<any>) {
    const baseTables = await this.getTables(options);
    const tableSchemas = await this.getTableSchemas(options);

    // Enrich tables with CHECK constraint enum values
    const tables = baseTables.map((table) => {
      const tableSql = tableSchemas.get(table.name);
      if (!tableSql) {
        return table;
      }

      const checkEnums = parseCheckConstraints(tableSql);
      if (Object.keys(checkEnums).length === 0) {
        return table;
      }

      // Create new columns with enumValues populated
      const enrichedColumns = table.columns.map((column) => {
        const enumValues = checkEnums[column.name.toLowerCase()];
        if (enumValues) {
          return new ColumnMetadata({
            comment: column.comment,
            dataType: column.dataType,
            dataTypeSchema: column.dataTypeSchema,
            enumValues,
            hasDefaultValue: column.hasDefaultValue,
            isAutoIncrementing: column.isAutoIncrementing,
            isNullable: column.isNullable,
            name: column.name,
          });
        }
        return column;
      });

      return new TableMetadata({
        columns: enrichedColumns,
        isView: table.isView,
        name: table.name,
        schema: table.schema,
      });
    });

    const enums = new EnumCollection();
    return new DatabaseMetadata({ enums, tables });
  }
}
