// To run, go into main Folder of the project and write: node backend/tests/DocumentUploadDownload/testDocumentModel.js 
import "dotenv/config";
import mongoose from "mongoose";
import Document from "../../models/Document.js"; 
import Folder from "../../models/Folder.js";

// for this specific testing, we import things to upload a file
import fs from "fs";
import path from "path";
//

const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;

const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;

await mongoose.connect(mongoURI);
console.log("Connected to MongoDB for testing");


//------------ Testing logic
// Use the sample image testBild.png located alongside the tests
const filePath = path.resolve("./backend/tests/DocumentUploadDownload/testBild.png");
const fileBuffer = fs.readFileSync(filePath);
const fileBinaryData = fileBuffer;

// define the values here
const userId = new mongoose.Types.ObjectId();
const originalFileName = "testBild.png"
const fileType = "image/png"
const title = "Rechnung April 2025 04"
const extractedFields = {
    Kundennummer: "115.15",
    Gesamtsumme: "115.15"
}
const tags = []


// NOTE: per request we DO NOT delete previous documents or folders in this test
// (leave created artifacts for inspection). The following cleanup is intentionally disabled.
/*
// delete previous document with the same title
const deleted = await Document.deleteMany({ title: title });
// if it found something to delete, let me know
if (deleted.deletedCount > 0) {
    console.log(`Deleted ${deleted.deletedCount} document(s) with title "${title}"`);
}
*/

// create the test document
try {
    // Create the test document first (no folder association yet)
    const testDoc = new Document({
        userId,
        originalFileName,
        fileType,
        title,
        extractedFields,
        tags,
        fileBinaryData: fileBinaryData,
        fileSize: fileBinaryData.length,
    });

    // save the test document
    await testDoc.save();
    console.log("Document saved (no folder):", testDoc._id.toString());

    // Now create a folder to attach the document to
    const folder = new Folder({ userId, name: 'createdFolderTest' });
    await folder.save();
    console.log('Created folder:', folder._id.toString());

    // Attach the document to the folder (move it)
    testDoc.folderId = folder._id;
    await testDoc.save();
    console.log('Document updated with folderId:', testDoc.folderId.toString());

    const found = await Document.findById(testDoc._id).select('-fileBinaryData');
    console.log("Final document record:", found);

} catch (err) {
    console.error("Test failed:", err);
} finally {
    await mongoose.disconnect();
    console.log("Disconnected");
}
