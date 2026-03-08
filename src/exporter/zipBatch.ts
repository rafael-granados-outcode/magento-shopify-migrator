import fs from "fs";
import archiver from "archiver";

export async function zipBatch(folder: string, outputZip: string) {

  return new Promise((resolve, reject) => {

    const output = fs.createWriteStream(outputZip);
    const archive = archiver("zip");

    output.on("close", resolve);
    archive.on("error", reject);

    archive.pipe(output);
    archive.directory(folder, false);

    archive.finalize();
  });
}