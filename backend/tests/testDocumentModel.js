// To run, go into main Folder and write: node backend/tests/testDocumentModel.js 
import "dotenv/config";
import mongoose from "mongoose";
import Document from "../models/Document.js"; 

const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;

const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

await mongoose.connect(mongoURI);
console.log("Connected to MongoDB for testing");

// Testing logic

// NOTES TO DO:
// normalise findOne to look for nonspecific type
try {
  const testDoc = new Document({
    originalFileName: "invoice_2024_02.pdf",
    fileType: "jpg",
    title: "Rechnung Februar 2025",
    extractedFields: { Kundennummer: "12345", Gesamtsumme: 120.99 },
    tags: "",
  });

  await testDoc.save();
  console.log("Document saved:", testDoc);

  const found = await Document.findOne({ "extractedFields.Gesamtsumme": 120.99 });
  console.log("Found:", found);

} catch (err) {
  console.error("Test failed:", err);
} finally {
  await mongoose.disconnect();
  console.log("Disconnected");
}
