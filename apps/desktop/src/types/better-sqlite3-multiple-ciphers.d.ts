/// <reference path="../../node_modules/better-sqlite3-multiple-ciphers/index.d.ts" />

declare module "better-sqlite3-multiple-ciphers" {
  import Database = require("better-sqlite3-multiple-ciphers/index");
  namespace Database {
    export type Database = Database.Database;
    export type Statement<BindParameters extends unknown[] | {} = unknown[], Result = unknown> = Database.Statement<BindParameters, Result>;
    export type Transaction<T extends (...args: any[]) => unknown = (...args: any[]) => unknown> = Database.Transaction<T>;
    export type RunResult = Database.RunResult;
  }
  export = Database;
}
