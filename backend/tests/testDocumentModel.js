// To run, go into main Folder of the project and write: node backend/tests/testDocumentModel.js 
import "dotenv/config";
import mongoose from "mongoose";
import Document from "../models/Document.js"; 

const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;

const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

await mongoose.connect(mongoURI);
console.log("Connected to MongoDB for testing");

// Testing logic

// define the values here
const originalFileName = "invoice_2024_03.pdf"
const fileType = "jpg"
const title = "Rechnung Februar 2025 03"
const extractedFields = {
    Kundennummer: "115.15",
    Gesamtsumme: "115.15"
}
const tags = ["TestTag1", "TestTag2"]

// delete previous document with the same title
const deleteResult = await Document.deleteMany({ title: title });
// if it found something to delete, let me know
if (deleteResult.deletedCount > 0) {
    console.log(`Deleted ${deleteResult.deletedCount} document(s) with title "${title}"`);
}

// create the test document
try {
    const testDoc = new Document({
        originalFileName: originalFileName,
        fileType: fileType,
        title: title,
        extractedFields: extractedFields,
        tags: tags,
    });

  // save the test document
    await testDoc.save();
    console.log("Document saved:", testDoc);

    const found = await Document.findOne({ "extractedFields.Gesamtsumme": "115.25" });
    console.log("Found:", found);

} catch (err) {
    console.error("Test failed:", err);
} finally {
    await mongoose.disconnect();
    console.log("Disconnected");
}
