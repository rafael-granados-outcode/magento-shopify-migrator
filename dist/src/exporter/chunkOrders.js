"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chunkOrders = chunkOrders;
function chunkOrders(ids, size) {
    const chunks = [];
    for (let i = 0; i < ids.length; i += size) {
        chunks.push(ids.slice(i, i + size));
    }
    return chunks;
}
