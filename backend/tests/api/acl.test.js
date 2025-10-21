import request from 'supertest';
import { describe, it, before, after } from 'mocha';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Document from '../../models/Document.js';
import Folder from '../../models/Folder.js';

const baseUrl = 'http://localhost:4000';
// Authenticate as this user when making requests (always send header, works in CI)
const TEST_USER_ID = '650000000000000000000001';
// Create resources owned by a DIFFERENT user to test cross-user access protection
const OTHER_USER = '6500000000000000000000ff';

describe('ACL / Auth - cross-user access', function () {
  this.timeout(10000);
  let docId;
  let folderId;

  before(async function () {
    // connect directly to DB and create resources owned by OTHER_USER
    // Build mongo URI using env vars if available (match server.js behavior)
    const { MONGO_USER, MONGO_PASS, MONGO_HOST, MONGO_PORT, MONGO_DB } = process.env;
    let mongoUri;
    if (MONGO_USER && MONGO_PASS && MONGO_HOST && MONGO_PORT && MONGO_DB) {
      mongoUri = `mongodb://${MONGO_USER}:${MONGO_PASS}@${MONGO_HOST}:${MONGO_PORT}/${MONGO_DB}?authSource=admin`;
    } else {
      mongoUri = process.env.MONGO_URI || process.env.MONGO_URL || `mongodb://localhost:27017/papertrail`;
    }

    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(mongoUri, { dbName: process.env.MONGO_DB || undefined });
    }

    const timestamp = Date.now();
    const folder = new Folder({
      userId: new mongoose.Types.ObjectId(OTHER_USER),
      name: 'acl-folder-test-' + timestamp,
      nameLower: ('acl-folder-test-' + timestamp).toLowerCase(),
      slug: 'acl-folder-test-' + timestamp,
    });
    await folder.save();
    folderId = folder._id.toString();

    const doc = new Document({
      userId: new mongoose.Types.ObjectId(OTHER_USER),
      title: 'ACL Test Doc ' + timestamp,
      originalFileName: 'acl.pdf',
      fileType: 'application/pdf',
      fileSize: 1,
      fileBinaryData: Buffer.from('x'),
      fileHash: 'hash-acl-' + timestamp,
      titleHash: 'thash-acl-' + timestamp,
      folderId: new mongoose.Types.ObjectId(folderId),
    });
    await doc.save();
    docId = doc._id.toString();
  });

  after(async function () {
    // cleanup created resources - delete by IDs to ensure we only remove our test data
    try {
      if (docId) await Document.findByIdAndDelete(docId);
    } catch (err) {
      // ignore
    }
    try {
      if (folderId) await Folder.findByIdAndDelete(folderId);
    } catch (err) {
      // ignore
    }
    // don't close mongoose connection since other tests may use it
  });

  it('prevents server dev user from fetching a document owned by another user', async function () {
    const res = await request(baseUrl)
      .get(`/api/documents/${docId}`)
      .set('X-Dev-User-Id', TEST_USER_ID)
      .set('Accept', 'application/json');

    assert.strictEqual(res.status, 403);
  });

  it('prevents server dev user from deleting a document owned by another user', async function () {
    const res = await request(baseUrl)
      .delete(`/api/documents/${docId}`)
      .set('X-Dev-User-Id', TEST_USER_ID);
    assert.strictEqual(res.status, 403);
  });

  it('prevents server dev user from updating a document owned by another user', async function () {
    const res = await request(baseUrl)
      .put(`/api/documents/${docId}`)
      .set('X-Dev-User-Id', TEST_USER_ID)
      .send({ title: 'Hacked' });
    // some controllers return 404 for non-existent / not-owned; accept 403 or 404 as valid protection
    assert.ok(res.status === 403 || res.status === 404);
  });

  it('prevents server dev user from fetching a folder owned by another user', async function () {
    const res = await request(baseUrl)
      .get(`/api/folders/${folderId}`)
      .set('X-Dev-User-Id', TEST_USER_ID);
    assert.strictEqual(res.status, 403);
  });

  it('prevents server dev user from deleting a folder owned by another user', async function () {
    const res = await request(baseUrl)
      .delete(`/api/folders/${folderId}`)
      .set('X-Dev-User-Id', TEST_USER_ID);
    assert.strictEqual(res.status, 403);
  });
});
