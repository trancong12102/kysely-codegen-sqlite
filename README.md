# ![kysely-codegen-sqlite](./assets/kysely-codegen-logo.svg) <!-- omit from toc -->

`kysely-codegen-sqlite` generates Kysely type definitions from your SQLite database. That's it.

## Table of contents <!-- omit from toc -->

- [Installation](#installation)
- [Generating type definitions](#generating-type-definitions)
- [Using the type definitions](#using-the-type-definitions)
- [CLI arguments](#cli-arguments) - [Basic example](#basic-example) - [Named imports with aliasing](#named-imports-with-aliasing)
- [Configuration file](#configuration-file)

## Installation

```sh
npm install --save-dev kysely-codegen-sqlite
```

You will also need to install Kysely with your driver of choice:

```sh
npm install kysely better-sqlite3
```

## Generating type definitions

The most convenient way to get started is to create an `.env` file with your database connection string:

```sh
DATABASE_URL=./path/to/database.db
```

Then run the following command, or add it to the scripts section in your package.json file:

```sh
kysely-codegen-sqlite
```

This command will generate a `.d.ts` file from your database, for example:

<!-- prettier-ignore -->
```ts
import { ColumnType } from 'kysely';

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface Company {
  id: Generated<number>;
  name: string;
}

export interface User {
  company_id: number | null;
  created_at: Generated<string>;
  email: string;
  id: Generated<number>;
  is_active: number;
  name: string;
  updated_at: string;
}

export interface DB {
  company: Company;
  user: User;
}
```

To specify a different output file:

```sh
kysely-codegen-sqlite --out-file ./src/db/db.d.ts
```

## Using the type definitions

Import `DB` into `new Kysely<DB>`, and you're done!

```ts
import { Kysely } from 'kysely';
import BetterSqlite3 from 'better-sqlite3';
import { BetterSqlite3Dialect } from 'kysely';
import { DB } from 'kysely-codegen-sqlite';

const db = new Kysely<DB>({
  dialect: new BetterSqlite3Dialect({
    database: new BetterSqlite3('./database.db'),
  }),
});

const rows = await db.selectFrom('users').selectAll().execute();
//    ^ { created_at: string; email: string; id: number; ... }[]
```

If you need to use the generated types in e.g. function parameters and type definitions, you may need to use the Kysely `Insertable`, `Selectable`, `Updateable` types. Note that you don't need to explicitly annotate query return values, as it's recommended to let Kysely infer the types for you.

```ts
import { Insertable, Updateable } from 'kysely';
import { DB } from 'kysely-codegen-sqlite';
import { db } from './db';

async function insertUser(user: Insertable<User>) {
  return await db
    .insertInto('users')
    .values(user)
    .returningAll()
    .executeTakeFirstOrThrow();
  // ^ Selectable<User>
}

async function updateUser(id: number, user: Updateable<User>) {
  return await db
    .updateTable('users')
    .set(user)
    .where('id', '=', id)
    .returning(['email', 'id'])
    .executeTakeFirstOrThrow();
  // ^ { email: string; id: number; }
}
```

Read the [Kysely documentation](https://kysely.dev/docs/getting-started) for more information.

## CLI arguments

#### --camel-case <!-- omit from toc -->

Use the Kysely CamelCasePlugin for generated table column names.

**Example:**

```ts
export interface User {
  companyId: number | null;
  createdAt: Generated<string>;
  email: string;
  id: Generated<number>;
  isActive: number;
  name: string;
  updatedAt: string;
}
```

#### --config-file <!-- omit from toc -->

Specify the path to the configuration file to use.

#### --custom-imports <!-- omit from toc -->

Specify custom type imports to use with type overrides. This is particularly useful when using custom types from external packages or local files.

##### Basic example

```sh
kysely-codegen-sqlite --custom-imports='{"MyCustomType":"./custom-types"}'
```

##### Named imports with aliasing

You can import specific named exports and optionally alias them using the `#` syntax:

```sh
kysely-codegen-sqlite --custom-imports='{"MyType":"./types#OriginalType"}'
```

This generates:

```ts
import type { OriginalType as MyType } from './types';
```

Then you can use these imported types in your overrides:

```sh
kysely-codegen-sqlite --overrides='{"columns":{"events.data":"ColumnType<MyCustomType, MyCustomType, never>"}}'
```

#### --default-schema [value] <!-- omit from toc -->

Set the default schema(s) for the database connection.

Multiple schemas can be specified:

```sh
kysely-codegen-sqlite --default-schema=main --default-schema=temp
```

#### --env-file [value] <!-- omit from toc -->

Specify the path to an environment file to use.

#### --help, -h <!-- omit from toc -->

Print all command line options.

#### --include-pattern [value], --exclude-pattern [value] <!-- omit from toc -->

You can choose which tables should be included during code generation by providing a glob pattern to the `--include-pattern` and `--exclude-pattern` flags. We use [micromatch](https://github.com/micromatch/micromatch) under the hood, which provides advanced glob support. For instance, if you only want to include certain tables:

```sh
kysely-codegen-sqlite --include-pattern="user*"
```

You can also include only certain tables:

```sh
kysely-codegen-sqlite --include-pattern="+(user|post)"
```

Or exclude certain tables:

```sh
kysely-codegen-sqlite --exclude-pattern="_*"
```

#### --log-level [value] <!-- omit from toc -->

Set the terminal log level. (values: `debug`/`info`/`warn`/`error`/`silent`, default: `warn`)

#### --overrides <!-- omit from toc -->

Specify type overrides for specific table columns in JSON format.

**Example:**

```sh
kysely-codegen-sqlite --overrides='{"columns":{"table_name.column_name":"{foo:\"bar\"}"}}'
```

#### --out-file [value] <!-- omit from toc -->

Set the file build path. (default: `./node_modules/kysely-codegen-sqlite/dist/db.d.ts`)

#### --print <!-- omit from toc -->

Print the generated output to the terminal instead of a file.

#### --singularize <!-- omit from toc -->

Singularize generated type aliases, e.g. as `BlogPost` instead of `BlogPosts`. The codegen uses the [pluralize](https://www.npmjs.com/package/pluralize) package for singularization.

You can specify custom singularization rules in the [configuration file](#configuration-file).

#### --type-mapping <!-- omit from toc -->

Specify type mappings for database types, in JSON format. This allows you to automatically map database types to custom TypeScript types.

**Example:**

```sh
kysely-codegen-sqlite --type-mapping='{"datetime":"Date"}' --custom-imports='{}'
```

Type mappings are automatically applied to all columns of the specified database type, eliminating the need to override each column individually.

#### --type-only-imports <!-- omit from toc -->

Generate code using the TypeScript 3.8+ `import type` syntax. (default: `true`)

#### --url [value] <!-- omit from toc -->

Set the database connection string URL. This may point to an environment variable. (default: `env(DATABASE_URL)`)

#### --verify <!-- omit from toc -->

Verify that the generated types are up-to-date. (default: `false`)

## Configuration file

<!-- cspell:ignore sqliterc -->
All codegen options can also be configured in a configuration file (e.g., `.kysely-codegen-sqliterc.json`, `.js`, `.ts`, `.yaml` etc.) or the `kysely-codegen-sqlite` property in `package.json`. See [Cosmiconfig](https://github.com/cosmiconfig/cosmiconfig) for all available configuration file formats.

The default configuration:

```json
{
  "camelCase": false,
  "customImports": {},
  "defaultSchemas": [],
  "dialect": null,
  "envFile": null,
  "excludePattern": null,
  "includePattern": null,
  "logLevel": "warn",
  "outFile": "./node_modules/kysely-codegen-sqlite/dist/db.d.ts",
  "overrides": {},
  "print": false,
  "singularize": false,
  "typeMapping": {},
  "typeOnlyImports": true,
  "url": "env(DATABASE_URL)",
  "verify": false
}
```

The configuration object adds support for more advanced options:

```json
{
  "camelCase": true,
  "customImports": {
    "MyCustomType": "@my-org/custom-types",
    "AliasedType": "./types#OriginalType"
  },
  "overrides": {
    "columns": {
      "posts.author_type": "AliasedType",
      "users.settings": "{ theme: 'dark' }"
    }
  },
  "singularize": {
    "/^(.*?)s?$/": "$1_model"
  },
  "typeMapping": {
    "datetime": "Date"
  }
}
```

The generated output:

```ts
import type { MyCustomType } from '@my-org/custom-types';
import type { OriginalType as AliasedType } from './types';

export interface UserModel {
  settings: { theme: 'dark' };
}

// ...

export interface DB {
  users: UserModel;
}
```

## Credits

This project is a fork of [kysely-codegen](https://github.com/RobinBlomberg/kysely-codegen) by [Robin Blomberg](https://github.com/RobinBlomberg). Thank you to the original author and all contributors for their work on the original project.
