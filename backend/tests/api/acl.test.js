import request from 'supertest';
import { describe, it, before, after } from 'mocha';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import Document from '../../models/Document.js';
import Folder from '../../models/Folder.js';

const baseUrl = 'http://localhost:4000';
// Server likely enforces a dev user via DEV_CURRENT_USER_ID; detect it
const serverDevUser = process.env.DEV_CURRENT_USER_ID || '6500000000000000000000dd';
// create resources owned by OTHER_USER so that requests from the server's dev user are rejected
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

    const folder = new Folder({
      userId: new mongoose.Types.ObjectId(OTHER_USER),
      name: 'acl-folder-test-' + Date.now(),
      nameLower: 'acl-folder-test',
      slug: 'acl-folder-test-' + Date.now(),
    });
    await folder.save();
    folderId = folder._id.toString();

    const doc = new Document({
      userId: new mongoose.Types.ObjectId(OTHER_USER),
      title: 'ACL Test Doc',
      originalFileName: 'acl.pdf',
      fileType: 'application/pdf',
      fileSize: 1,
      fileBinaryData: Buffer.from('x'),
      fileHash: 'hash-acl',
      titleHash: 'thash-acl',
      folderId: new mongoose.Types.ObjectId(folderId),
    });
    await doc.save();
    docId = doc._id.toString();
  });

  after(async function () {
    // cleanup created resources (ignore errors like auth failures to avoid noisy test failures)
    try {
      await Document.deleteMany({ title: 'ACL Test Doc' });
    } catch (err) {
      // ignore
    }
    try {
      await Folder.deleteMany({ slug: /acl-folder-test/ });
    } catch (err) {
      // ignore
    }
    // don't close mongoose connection since other tests may use it
  });

  it('prevents server dev user from fetching a document owned by another user', async function () {
    const res = await request(baseUrl)
      .get(`/api/documents/${docId}`)
      .set('Accept', 'application/json');

    assert.strictEqual(res.status, 403);
  });

  it('prevents server dev user from deleting a document owned by another user', async function () {
    const res = await request(baseUrl).delete(`/api/documents/${docId}`);
    assert.strictEqual(res.status, 403);
  });

  it('prevents server dev user from updating a document owned by another user', async function () {
    const res = await request(baseUrl).put(`/api/documents/${docId}`).send({ title: 'Hacked' });
    // some controllers return 404 for non-existent / not-owned; accept 403 or 404 as valid protection
    assert.ok(res.status === 403 || res.status === 404);
  });

  it('prevents server dev user from fetching a folder owned by another user', async function () {
    const res = await request(baseUrl).get(`/api/folders/${folderId}`);
    assert.strictEqual(res.status, 403);
  });

  it('prevents server dev user from deleting a folder owned by another user', async function () {
    const res = await request(baseUrl).delete(`/api/folders/${folderId}`);
    assert.strictEqual(res.status, 403);
  });
});
