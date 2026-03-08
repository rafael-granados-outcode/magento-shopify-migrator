export function chunkOrders(ids: number[], size: number) {

  const chunks: number[][] = [];

  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }

  return chunks;
}