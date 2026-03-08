"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zipBatch = zipBatch;
const fs_1 = __importDefault(require("fs"));
const archiver_1 = __importDefault(require("archiver"));
async function zipBatch(folder, outputZip) {
    return new Promise((resolve, reject) => {
        const output = fs_1.default.createWriteStream(outputZip);
        const archive = (0, archiver_1.default)("zip");
        output.on("close", resolve);
        archive.on("error", reject);
        archive.pipe(output);
        archive.directory(folder, false);
        archive.finalize();
    });
}
