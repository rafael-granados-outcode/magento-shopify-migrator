import fs from "fs";
import { loadOrderIds } from "./loadOrderIds";
import { chunkOrders } from "./chunkOrders";
import { exportTable } from "./exportTable";
import { zipBatch } from "./zipBatch";

export async function exportMagentoOrders() {

  const orderIds = await loadOrderIds();

  const batches = chunkOrders(orderIds, 10000);

  let batchIndex = 1;

  for (const ids of batches) {

    const dir = `exports/batch_${batchIndex}`;

    fs.mkdirSync(dir, { recursive: true });

    console.log(`Exporting batch ${batchIndex}`);

    await exportTable(
      "sales_flat_order",
      "entity_id",
      ids,
      `${dir}/sales_flat_order.csv`
    );

    await exportTable(
      "sales_flat_order_address",
      "parent_id",
      ids,
      `${dir}/sales_flat_order_address.csv`
    );

    await exportTable(
      "sales_flat_order_item",
      "order_id",
      ids,
      `${dir}/sales_flat_order_item.csv`,
      "AND parent_item_id IS NULL"
    );

    await exportTable(
      "sales_flat_order_payment",
      "parent_id",
      ids,
      `${dir}/sales_flat_order_payment.csv`
    );

    await exportTable(
      "sales_flat_order_status_history",
      "parent_id",
      ids,
      `${dir}/sales_flat_order_status_history.csv`
    );

    await exportTable(
      "sales_flat_shipment_track",
      "order_id",
      ids,
      `${dir}/sales_flat_shipment_track.csv`
    );

    await zipBatch(dir, `exports/batch_${batchIndex}.zip`);

    console.log(`Batch ${batchIndex} ready`);

    batchIndex++;
  }

  console.log("All batches exported");
}