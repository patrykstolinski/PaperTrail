import "dotenv/config";
import mongoose from 'mongoose';
import Folder from '../../models/Folder.js';
import Document from '../../models/Document.js';

import { createFolder } from '../../controllers/folderController.js';
import { createDocument, updateDocument } from '../../controllers/documentController.js';

async function connect() {
  const { MONGO_USER, MONGO_PASS, MONGO_DB, MONGO_PORT, MONGO_HOST } = process.env;
  const mongoURI = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
  await mongoose.connect(mongoURI, {});
}

function mockRes() {
  const res = {};
  res.statusCode = 200;
  res.body = null;
  res.status = function (s) { this.statusCode = s; return this; };
  res.json = function (b) { this.body = b; return this; };
  return res;
}

async function run() {
  await connect();
  console.log('Connected to Mongo for document-folder integration test');
  const userA = new mongoose.Types.ObjectId();

  try {
    // Create initial folder
    const reqF1 = { user: { id: userA.toString() }, body: { name: 'Invoices' } };
    const resF1 = mockRes();
    await createFolder(reqF1, resF1);
    if (resF1.statusCode !== 201) throw new Error('Folder create failed: ' + JSON.stringify(resF1.body));
    const folder1 = resF1.body.data;

    // Create a document referencing the folder
    const fakeFile = { buffer: Buffer.from('doccontent'), size: 10, mimetype: 'application/pdf', originalname: 'file.pdf' };
    const reqDoc = { user: { id: userA.toString() }, file: fakeFile, body: { title: 'Doc1', folderId: folder1._id.toString() } };
    const resDoc = mockRes();
    await createDocument(reqDoc, resDoc);
    if (resDoc.statusCode !== 201) throw new Error('Document create failed: ' + JSON.stringify(resDoc.body));
    const docId = resDoc.body.id;
    const saved = await Document.findById(docId);
    if (!saved.folderId) throw new Error('Document.folderId not set');
  console.log('Document created with folderId', saved.folderId.toString());

    // Create second folder and move document to it via updateDocument
    const reqF2 = { user: { id: userA.toString() }, body: { name: 'Receipts' } };
    const resF2 = mockRes();
    await createFolder(reqF2, resF2);
    const folder2 = resF2.body.data;

    const reqUpdate = { params: { id: docId }, user: { id: userA.toString() }, body: { folderId: folder2._id.toString() } };
    const resUpdate = mockRes();
    await updateDocument(reqUpdate, resUpdate);
    if (resUpdate.statusCode !== 200) throw new Error('Document update failed: ' + JSON.stringify(resUpdate.body));
    const updated = await Document.findById(docId);
    if (!updated.folderId || updated.folderId.toString() !== folder2._id.toString()) throw new Error('Document folderId not updated correctly');
  console.log('Document moved to folder', updated.folderId.toString());

    console.log('Document-folder integration test PASSED');
  } catch (err) {
    console.error('Document-folder test FAILED', err);
    process.exit(1);
  } finally {
    try { await Document.deleteMany({ title: /Doc1/ }); } catch (e) {}
    try { await Folder.deleteMany({ name: /Invoices|Receipts/ }); } catch (e) {}
    await mongoose.disconnect();
  }
}

run();
