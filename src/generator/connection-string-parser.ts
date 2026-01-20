import { config as loadEnv } from 'dotenv';
import { expand as expandEnv } from 'dotenv-expand';
import type { Logger } from './logger/logger';

const CALL_STATEMENT_REGEXP = /^\s*([a-z]+)\s*\(\s*(.*)\s*\)\s*$/;

type ParseConnectionStringOptions = {
  connectionString: string;
  envFile?: string;
  logger?: Logger;
};

/**
 * Parses a connection string URL or loads it from an environment file.
 */
export class ConnectionStringParser {
  parse(options: ParseConnectionStringOptions): string {
    let connectionString = options.connectionString;

    const expressionMatch = connectionString.match(CALL_STATEMENT_REGEXP);

    if (expressionMatch) {
      const name = expressionMatch[1]!;

      if (name !== 'env') {
        throw new ReferenceError(`Function '${name}' is not defined.`);
      }

      const keyToken = expressionMatch[2]!;
      let key: string | undefined;

      try {
        key = keyToken.includes('"') ? JSON.parse(keyToken) : keyToken;
      } catch {
        throw new SyntaxError(
          `Invalid connection string: '${connectionString}'`,
        );
      }

      if (typeof key !== 'string') {
        throw new TypeError(
          `Argument 0 of function '${name}' must be a string.`,
        );
      }

      const { error } = expandEnv(loadEnv({ path: options.envFile }));
      const displayEnvFile = options.envFile ?? '.env';

      if (error) {
        if (
          'code' in error &&
          typeof error.code === 'string' &&
          error.code === 'ENOENT'
        ) {
          if (options.envFile !== undefined) {
            throw new ReferenceError(
              `Could not resolve connection string '${connectionString}'. ` +
                `Environment file '${displayEnvFile}' could not be found. ` +
                "Use '--env-file' to specify a different file.",
            );
          }
        } else {
          throw error;
        }
      } else {
        options.logger?.info(
          `Loaded environment variables from '${displayEnvFile}'.`,
        );
      }

      const envConnectionString = process.env[key];

      if (!envConnectionString) {
        throw new ReferenceError(
          `Environment variable '${key}' could not be found.`,
        );
      }

      connectionString = envConnectionString;
    }

    return connectionString;
  }
}
