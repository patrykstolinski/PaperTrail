// To run, go into main Folder of the project and write: node backend/tests/DocumentUploadDownload/testDocumentModel.js 
import "dotenv/config";
import mongoose from "mongoose";
import Document from "../../models/Document.js"; 

// for this specific testing, we import things to upload a file
import fs from "fs";
import path from "path";
//

const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;

const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

await mongoose.connect(mongoURI);
console.log("Connected to MongoDB for testing");


//------------ Testing logic
const filePath = path.resolve("./backend/tests/DocumentUploadDownload/testPDF.pdf");
const fileBuffer = fs.readFileSync(filePath);
const fileBinaryData = fileBuffer;

// define the values here
const userId = new mongoose.Types.ObjectId();
const originalFileName = "invoice_2024_04.pdf"
const fileType = "pdf"
const title = "Rechnung April 2025 04"
const extractedFields = {
    Kundennummer: "115.15",
    Gesamtsumme: "115.15"
}
const tags = []


// delete previous document with the same title
const deleted = await Document.deleteMany({ title: title });
// if it found something to delete, let me know
if (deleted.deletedCount > 0) {
    console.log(`Deleted ${deleted.deletedCount} document(s) with title "${title}"`);
}

// create the test document
try {
    const testDoc = new Document({
        userId,
        originalFileName,
        fileType,
        title,
        extractedFields,
        tags,
        fileBinaryData
    });

  // save the test document
    await testDoc.save();
    console.log("Document saved:", testDoc);

    const found = await Document.findOne({ "extractedFields.Gesamtsumme": "115.15" });
    console.log("Found:", found);

} catch (err) {
    console.error("Test failed:", err);
} finally {
    await mongoose.disconnect();
    console.log("Disconnected");
}
