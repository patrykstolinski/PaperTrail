// To run, go into main Folder of the project and write: node backend/tests/DocumentUploadDownload/testDownload.js
import "dotenv/config";
import mongoose from "mongoose";
import fs from "fs";
import path from "path";
import Document from "../../models/Document.js";

const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;

const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

await mongoose.connect(mongoURI);
console.log("Connected to MongoDB for download test");

try {
  // change the title to match whatever used in upload test
  const title = "Rechnung April 2025 04";
  const foundDoc = await Document.findOne({ title });

  if (!foundDoc) {
    throw new Error(`No document found with title "${title}"`);
  }

  console.log("Found document:", foundDoc._id);

  // Extract the Buffer from fileBinaryData field
  const fileBuffer = foundDoc.fileBinaryData;

  if (!fileBuffer || !Buffer.isBuffer(fileBuffer)) {
    throw new Error("No valid file buffer found in fileBinaryData");
  }

  // Define where to save the downloaded file
  const outputPath = path.resolve("./backend/tests/DocumentUploadDownload/downloaded_testPDF.pdf");
  fs.writeFileSync(outputPath, fileBuffer);
  console.log(`File successfully written to: ${outputPath}`);

} catch (err) {
  console.error("Download test failed:", err);
} finally {
  await mongoose.disconnect();
  console.log("Disconnected from MongoDB");
}
