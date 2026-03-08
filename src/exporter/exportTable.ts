import { db } from "../db";
import { writeCsv } from "./writeCsv";

export async function exportTable(
  table: string,
  column: string,
  ids: number[],
  output: string,
  extraWhere: string = ""
) {

  const conn = await db();

  const placeholders = ids.map(() => "?").join(",");

  const query = `
    SELECT *
    FROM ${table}
    WHERE ${column} IN (${placeholders})
    ${extraWhere}
  `;

  const [rows] = await conn.query(query, ids);

  await conn.end();

  await writeCsv(rows as any[], output);
}