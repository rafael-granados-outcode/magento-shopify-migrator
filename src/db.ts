import "dotenv/config";
import * as mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

export async function db(): Promise<Connection> {
  const host = process.env.DB_HOST ?? "localhost";
  const user = process.env.DB_USER ?? "root";
  const password = process.env.DB_PASSWORD ?? "";
  const database = process.env.DB_NAME ?? "magento_local";

  return mysql.createConnection({
    host,
    user,
    password,
    database,
  });
}