import type { DatabaseMetadata } from '../../introspector';
import type { Config } from '../config';

const config: Config = {
  dialect: 'sqlite',
  logLevel: 'debug',
  outFile: null,
  serializer: {
    serializeFile(metadata: DatabaseMetadata) {
      return metadata.tables
        .map((table) => {
          return (
            'table ' +
            table.name +
            ' {\n' +
            table.columns
              .map((column) => `  ${column.name}: ${column.dataType}`)
              .join('\n') +
            '\n}'
          );
        })
        .join('\n\n');
    },
  },
  url: ':memory:',
};

export default config;
