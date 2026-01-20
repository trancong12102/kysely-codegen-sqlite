import { ok } from 'node:assert';
import { EnumCollection } from '../../introspector/enum-collection';
import type { ColumnMetadata } from '../../introspector/metadata/column-metadata';
import type { DatabaseMetadata } from '../../introspector/metadata/database-metadata';
import type { TableMetadata } from '../../introspector/metadata/table-metadata';
import { ExportStatementNode } from '../ast/export-statement-node';
import { IdentifierNode } from '../ast/identifier-node';
import { ImportStatementNode } from '../ast/import-statement-node';
import { InterfaceDeclarationNode } from '../ast/interface-declaration-node';
import { SqliteDialect } from '../dialects/sqlite/sqlite-dialect';
import { transform } from './transformer';

describe('transform with type mapping', () => {
  const createColumn = (
    name: string,
    dataType: string,
    options?: Partial<ColumnMetadata>,
  ): ColumnMetadata => ({
    comment: null,
    dataType,
    dataTypeSchema: undefined,
    enumValues: null,
    hasDefaultValue: false,
    isArray: false,
    isAutoIncrementing: false,
    isNullable: false,
    name,
    ...options,
  });

  const createTable = (
    name: string,
    columns: ColumnMetadata[],
  ): TableMetadata => ({
    columns,
    isPartition: false,
    isView: false,
    name,
    schema: undefined,
  });

  const createMetadata = (tables: TableMetadata[]): DatabaseMetadata => ({
    enums: new EnumCollection(),
    tables,
  });

  it('should apply type mapping to known scalar types', () => {
    const metadata = createMetadata([
      createTable('events', [
        createColumn('id', 'INTEGER'),
        createColumn('created_at', 'TEXT'),
        createColumn('event_name', 'TEXT'),
      ]),
    ]);

    const nodes = transform({
      customImports: {
        Temporal: '@js-temporal/polyfill',
      },
      dialect: new SqliteDialect(),
      metadata,
      typeMapping: {
        text: 'Temporal.Instant',
      },
    });

    // Find the import statement:
    const importNode = nodes.find(
      (node) =>
        node instanceof ImportStatementNode &&
        node.moduleName === '@js-temporal/polyfill',
    );
    ok(importNode);

    // Find the events table:
    const eventsNode = nodes.find(
      (node): node is ExportStatementNode<InterfaceDeclarationNode> =>
        node instanceof ExportStatementNode &&
        node.argument instanceof InterfaceDeclarationNode &&
        node.argument.id.name === 'Events',
    );

    ok(eventsNode);
    const eventsInterface = eventsNode.argument;
    const eventsBody = eventsInterface.body;

    // Check that the `int` column still uses default mapping:
    const idProp = eventsBody.properties.find((p) => p.key === 'id');
    ok(idProp);
    ok(idProp.value instanceof IdentifierNode);
  });

  it('should not apply type mapping to unknown types', () => {
    const metadata = createMetadata([
      createTable('test', [
        createColumn('id', 'INTEGER'),
        createColumn('unknown_type', 'my_custom_type'),
      ]),
    ]);

    const nodes = transform({
      dialect: new SqliteDialect(),
      metadata,
      typeMapping: {
        my_custom_type: 'MyCustomType',
      },
    });

    // Find the test table:
    const testNode = nodes.find(
      (node): node is ExportStatementNode<InterfaceDeclarationNode> =>
        node instanceof ExportStatementNode &&
        node.argument instanceof InterfaceDeclarationNode &&
        node.argument.id.name === 'Test',
    );

    ok(testNode);
    const testInterface = testNode.argument;
    const testBody = testInterface.body;

    // Check that `unknown_type` falls back to the default scalar:
    const unknownProp = testBody.properties.find(
      (p) => p.key === 'unknown_type',
    );
    ok(unknownProp);
    ok(unknownProp.value instanceof IdentifierNode);
  });
});
