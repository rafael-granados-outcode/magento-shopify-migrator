"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportMagentoOrders = exportMagentoOrders;
const fs_1 = __importDefault(require("fs"));
const loadOrderIds_1 = require("./loadOrderIds");
const chunkOrders_1 = require("./chunkOrders");
const exportTable_1 = require("./exportTable");
const zipBatch_1 = require("./zipBatch");
async function exportMagentoOrders() {
    const orderIds = await (0, loadOrderIds_1.loadOrderIds)();
    const batches = (0, chunkOrders_1.chunkOrders)(orderIds, 10000);
    let batchIndex = 1;
    for (const ids of batches) {
        const dir = `exports/batch_${batchIndex}`;
        fs_1.default.mkdirSync(dir, { recursive: true });
        console.log(`Exporting batch ${batchIndex}`);
        await (0, exportTable_1.exportTable)("sales_flat_order", "entity_id", ids, `${dir}/sales_flat_order.csv`);
        await (0, exportTable_1.exportTable)("sales_flat_order_address", "parent_id", ids, `${dir}/sales_flat_order_address.csv`);
        await (0, exportTable_1.exportTable)("sales_flat_order_item", "order_id", ids, `${dir}/sales_flat_order_item.csv`, "AND parent_item_id IS NULL");
        await (0, exportTable_1.exportTable)("sales_flat_order_payment", "parent_id", ids, `${dir}/sales_flat_order_payment.csv`);
        await (0, exportTable_1.exportTable)("sales_flat_order_status_history", "parent_id", ids, `${dir}/sales_flat_order_status_history.csv`);
        await (0, exportTable_1.exportTable)("sales_flat_shipment_track", "order_id", ids, `${dir}/sales_flat_shipment_track.csv`);
        await (0, zipBatch_1.zipBatch)(dir, `exports/batch_${batchIndex}.zip`);
        console.log(`Batch ${batchIndex} ready`);
        batchIndex++;
    }
    console.log("All batches exported");
}
