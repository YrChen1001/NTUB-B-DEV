declare module "better-sqlite3" {
  export interface Statement<BindParameters = any[], Row = any> {
    all(...params: BindParameters[]): Row[];
    get(...params: BindParameters[]): Row | undefined;
    run(...params: BindParameters[]): any;
  }

  export interface Database {
    prepare<BindParameters = any[], Row = any>(
      sql: string
    ): Statement<BindParameters, Row>;
    transaction<Args extends any[], ReturnType>(
      fn: (...args: Args) => ReturnType
    ): (...args: Args) => ReturnType;
    pragma(source: string): unknown;
    close(): void;
  }

  const BetterSqlite3: {
    new (filename: string): Database;
  };

  export default BetterSqlite3;
}


