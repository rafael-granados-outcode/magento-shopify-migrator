import * as mysql from "mysql2/promise";
import type { Connection } from "mysql2/promise";

export async function db(): Promise<Connection> {
  return mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "Alejo1804*",
    database: "magento_local",
  });
}