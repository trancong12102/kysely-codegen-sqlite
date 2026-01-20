import { deepStrictEqual } from 'node:assert';
import { EnumCollection } from '../../introspector/enum-collection';
import { ColumnMetadata } from '../../introspector/metadata/column-metadata';
import { DatabaseMetadata } from '../../introspector/metadata/database-metadata';
import { TableMetadata } from '../../introspector/metadata/table-metadata';
import { AliasDeclarationNode } from '../ast/alias-declaration-node';
import { ExportStatementNode } from '../ast/export-statement-node';
import { GenericExpressionNode } from '../ast/generic-expression-node';
import { IdentifierNode, TableIdentifierNode } from '../ast/identifier-node';
import { ImportClauseNode } from '../ast/import-clause-node';
import { ImportStatementNode } from '../ast/import-statement-node';
import { InterfaceDeclarationNode } from '../ast/interface-declaration-node';
import { JsonColumnTypeNode } from '../ast/json-column-type-node';
import { ObjectExpressionNode } from '../ast/object-expression-node';
import { PropertyNode } from '../ast/property-node';
import { RawExpressionNode } from '../ast/raw-expression-node';
import { SqliteDialect } from '../dialects/sqlite/sqlite-dialect';
import { GLOBAL_DEFINITIONS } from './definitions';
import { transform } from './transformer';

describe(transform.name, () => {
  const enums = new EnumCollection();

  const transformWithDefaults = ({
    camelCase,
    tables,
  }: {
    camelCase?: boolean;
    tables: TableMetadata[];
  }) => {
    return transform({
      camelCase,
      dialect: new SqliteDialect(),
      metadata: new DatabaseMetadata({ enums, tables }),
      overrides: {
        columns: {
          'table.expression_override': new GenericExpressionNode('Generated', [
            new IdentifierNode('boolean'),
          ]),
          'table.json_override': new JsonColumnTypeNode(
            new RawExpressionNode('{ foo: "bar" }'),
          ),
          'table.raw_override': '{ test: string }',
        },
      },
    });
  };

  it('should transform correctly', () => {
    const nodes = transformWithDefaults({
      tables: [
        new TableMetadata({
          columns: [
            new ColumnMetadata({
              dataType: 'INTEGER',
              name: 'expression_override',
            }),
            new ColumnMetadata({
              dataType: 'TEXT',
              hasDefaultValue: true,
              name: 'text_field',
            }),
            new ColumnMetadata({
              dataType: 'TEXT',
              name: 'json_override',
            }),
            new ColumnMetadata({
              dataType: 'TEXT',
              name: 'raw_override',
            }),
          ],
          name: 'table',
          schema: 'public',
        }),
        new TableMetadata({
          columns: [
            new ColumnMetadata({
              dataType: 'INTEGER',
              name: 'id',
            }),
          ],
          name: 'other_table',
          schema: 'not_public',
        }),
      ],
    });

    deepStrictEqual(nodes, [
      new ImportStatementNode('kysely', [
        new ImportClauseNode('ColumnType'),
        new ImportClauseNode('JSONColumnType'),
      ]),
      new ExportStatementNode(
        new AliasDeclarationNode('Generated', GLOBAL_DEFINITIONS.Generated),
      ),
      new ExportStatementNode(
        new InterfaceDeclarationNode(
          new TableIdentifierNode('OtherTable'),
          new ObjectExpressionNode([
            new PropertyNode('id', new IdentifierNode('number')),
          ]),
        ),
      ),
      new ExportStatementNode(
        new InterfaceDeclarationNode(
          new TableIdentifierNode('Table'),
          new ObjectExpressionNode([
            new PropertyNode(
              'expression_override',
              new GenericExpressionNode('Generated', [
                new IdentifierNode('boolean'),
              ]),
            ),
            new PropertyNode(
              'text_field',
              new GenericExpressionNode('Generated', [
                new IdentifierNode('string'),
              ]),
            ),
            new PropertyNode(
              'json_override',
              new JsonColumnTypeNode(new RawExpressionNode('{ foo: "bar" }')),
            ),
            new PropertyNode(
              'raw_override',
              new RawExpressionNode('{ test: string }'),
            ),
          ]),
        ),
      ),
      new ExportStatementNode(
        new InterfaceDeclarationNode(
          new IdentifierNode('DB'),
          new ObjectExpressionNode([
            new PropertyNode(
              'other_table',
              new TableIdentifierNode('OtherTable'),
            ),
            new PropertyNode('table', new TableIdentifierNode('Table')),
          ]),
        ),
      ),
    ]);
  });

  it('should be able to transform to camelCase', () => {
    const nodes = transformWithDefaults({
      camelCase: true,
      tables: [
        new TableMetadata({
          columns: [
            new ColumnMetadata({
              dataType: 'TEXT',
              hasDefaultValue: true,
              name: 'baz_qux',
            }),
          ],
          name: 'foo_bar',
          schema: 'public',
        }),
      ],
    });

    deepStrictEqual(nodes, [
      new ImportStatementNode('kysely', [new ImportClauseNode('ColumnType')]),
      new ExportStatementNode(
        new AliasDeclarationNode('Generated', GLOBAL_DEFINITIONS.Generated),
      ),
      new ExportStatementNode(
        new InterfaceDeclarationNode(
          new TableIdentifierNode('FooBar'),
          new ObjectExpressionNode([
            new PropertyNode(
              'bazQux',
              new GenericExpressionNode('Generated', [
                new IdentifierNode('string'),
              ]),
            ),
          ]),
        ),
      ),
      new ExportStatementNode(
        new InterfaceDeclarationNode(
          new IdentifierNode('DB'),
          new ObjectExpressionNode([
            new PropertyNode('fooBar', new TableIdentifierNode('FooBar')),
          ]),
        ),
      ),
    ]);
  });

  it('should transform with custom imports correctly', () => {
    const nodes = transform({
      customImports: {
        InstantRange: './custom-types',
        MyCustomType: '@my-org/custom-types',
      },
      dialect: new SqliteDialect(),
      metadata: new DatabaseMetadata({
        enums,
        tables: [
          new TableMetadata({
            columns: [
              new ColumnMetadata({
                dataType: 'TEXT',
                name: 'custom_column',
              }),
            ],
            name: 'table',
            schema: 'public',
          }),
        ],
      }),
      overrides: {
        columns: {
          'table.custom_column': new GenericExpressionNode('ColumnType', [
            new IdentifierNode('InstantRange'),
            new IdentifierNode('InstantRange'),
            new IdentifierNode('never'),
          ]),
        },
      },
    });

    // Verify custom imports are included:
    const importNodes = nodes.filter((node) => node.type === 'ImportStatement');
    const customImport = importNodes.find(
      (node) => node.moduleName === './custom-types',
    );
    deepStrictEqual(
      customImport,
      new ImportStatementNode('./custom-types', [
        new ImportClauseNode('InstantRange'),
      ]),
    );
  });

  it('should support named imports with # syntax', () => {
    const nodes = transform({
      customImports: {
        InstantRange: './custom-types#CustomInstantRange',
        MyType: '@my-org/types#OriginalType',
        SameNameImport: './same-types#SameNameImport',
      },
      dialect: new SqliteDialect(),
      metadata: new DatabaseMetadata({
        enums,
        tables: [
          new TableMetadata({
            columns: [
              new ColumnMetadata({
                dataType: 'TEXT',
                name: 'date_range',
              }),
              new ColumnMetadata({
                dataType: 'TEXT',
                name: 'metadata',
              }),
              new ColumnMetadata({
                dataType: 'TEXT',
                name: 'same_data',
              }),
            ],
            name: 'events',
            schema: 'public',
          }),
        ],
      }),
      overrides: {
        columns: {
          'events.date_range': new GenericExpressionNode('ColumnType', [
            new IdentifierNode('InstantRange'),
            new IdentifierNode('InstantRange'),
            new IdentifierNode('never'),
          ]),
          'events.metadata': new IdentifierNode('MyType'),
          'events.same_data': new IdentifierNode('SameNameImport'),
        },
      },
    });

    // Verify custom imports with named exports are generated correctly:
    const importNodes = nodes.filter((node) => node.type === 'ImportStatement');

    // Check aliased import: `import { CustomInstantRange as InstantRange } from './custom-types';`
    const customImport = importNodes.find(
      (node) => node.moduleName === './custom-types',
    );
    deepStrictEqual(
      customImport,
      new ImportStatementNode('./custom-types', [
        new ImportClauseNode('CustomInstantRange', 'InstantRange'),
      ]),
    );

    // Check aliased import: `import { OriginalType as MyType } from '@my-org/types';`
    const orgImport = importNodes.find(
      (node) => node.moduleName === '@my-org/types',
    );
    deepStrictEqual(
      orgImport,
      new ImportStatementNode('@my-org/types', [
        new ImportClauseNode('OriginalType', 'MyType'),
      ]),
    );

    // Check non-aliased named import: `import { SameNameImport } from './same-types';`
    const sameImport = importNodes.find(
      (node) => node.moduleName === './same-types',
    );
    deepStrictEqual(
      sameImport,
      new ImportStatementNode('./same-types', [
        new ImportClauseNode('SameNameImport', null),
      ]),
    );
  });
});
