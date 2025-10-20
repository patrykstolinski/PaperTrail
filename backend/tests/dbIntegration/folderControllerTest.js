import "dotenv/config";
import mongoose from 'mongoose';
import Folder from '../../models/Folder.js';
import * as ctrl from '../../controllers/folderController.js';

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
  console.log('Connected to Mongo for folder controller integration test');

  const userA = new mongoose.Types.ObjectId();

  try {
    // CREATE
    const reqCreate = { user: { id: userA.toString() }, body: { name: 'Invoices', description: 'Invoice docs' } };
    const resCreate = mockRes();
    await ctrl.createFolder(reqCreate, resCreate);
    if (resCreate.statusCode !== 201) throw new Error('Create failed: ' + JSON.stringify(resCreate.body));
    const created = resCreate.body.data;
    console.log('Created folder', created._id.toString(), created.slug);

    // LIST
    const reqList = { user: { id: userA.toString() }, query: {} };
    const resList = mockRes();
    await ctrl.listFolders(reqList, resList);
    if (resList.statusCode !== 200) throw new Error('List failed');
    console.log('List returned', resList.body.data.length, 'folders');

    // GET
    const reqGet = { user: { id: userA.toString() }, params: { id: created._id.toString() } };
    const resGet = mockRes();
    await ctrl.getFolderById(reqGet, resGet);
    if (resGet.statusCode !== 200) throw new Error('Get failed');
    console.log('Get returned folder', resGet.body.data._id.toString());

    // UPDATE - rename
    const reqUpdate = { user: { id: userA.toString() }, params: { id: created._id.toString() }, body: { name: 'Invoices 2025' } };
    const resUpdate = mockRes();
    await ctrl.updateFolder(reqUpdate, resUpdate);
    if (resUpdate.statusCode !== 200) throw new Error('Update failed');
    console.log('Updated folder name to', resUpdate.body.data.name);

    // DELETE
    const reqDel = { user: { id: userA.toString() }, params: { id: created._id.toString() } };
    const resDel = mockRes();
    await ctrl.deleteFolder(reqDel, resDel);
    if (resDel.statusCode !== 200) throw new Error('Delete failed: ' + JSON.stringify(resDel.body));
    console.log('Deleted folder');

    console.log('Folder controller integration test PASSED');
  } catch (err) {
    console.error('Folder test FAILED', err);
    process.exit(1);
  } finally {
    try { await Folder.deleteMany({ name: /Invoices/ }); } catch (e) {}
    await mongoose.disconnect();
  }
}

run();
