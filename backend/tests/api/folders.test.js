import request from 'supertest';
import { describe, it, before, after } from 'mocha';
import assert from 'assert';
import mongoose from 'mongoose';

// This test requires the server to be running and a MongoDB available as configured in .env
// It performs a small end-to-end smoke test for folder endpoints (create, minimal list, get by id/slug, move docs, delete force)

const baseUrl = 'http://localhost:4000';
const devUser = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

describe('Folders API (smoke)', function() {
  this.timeout(10000);
  let createdFolderId;
  let createdDocId;

  before(async () => {
    // ensure mongoose can connect (optional)
    // we'll rely on the running server
  });

  it('POST /api/folders should create a folder', async () => {
    const uniqueName = 'testFolderForAPI-' + Date.now();
    const res = await request(baseUrl)
      .post('/api/folders')
      .set('X-Dev-User-Id', devUser)
      .send({ name: uniqueName, description: 'mocha test' });
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.data && res.body.data._id);
    createdFolderId = res.body.data._id;
  });

  it('POST duplicate folder name should return 409', async () => {
    // Get the folder we just created to reuse its exact name
    const getFolder = await request(baseUrl).get(`/api/folders/${createdFolderId}`).set('X-Dev-User-Id', devUser);
    const existingName = getFolder.body.data.name;
    
    const res = await request(baseUrl)
      .post('/api/folders')
      .set('X-Dev-User-Id', devUser)
      .send({ name: existingName, description: 'duplicate test' });
    assert.strictEqual(res.status, 409);
  });

  it('GET /api/folders?minimal=true should include documentCount', async () => {
    const res = await request(baseUrl)
      .get('/api/folders?minimal=true')
      .set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    // find our folder
    const found = res.body.data.find(f => f._id === createdFolderId);
    assert.ok(found, 'created folder should be in minimal listing');
    assert.ok(typeof found.documentCount === 'number');
  });

  it('GET /api/folders/:id should return the folder', async () => {
    const res = await request(baseUrl)
      .get(`/api/folders/${createdFolderId}`)
      .set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data._id, createdFolderId);
  });

  it('GET /api/folders/slug/:slug should return the folder', async () => {
    const list = await request(baseUrl).get('/api/folders?minimal=true').set('X-Dev-User-Id', devUser);
    const folder = list.body.data.find(f => f._id === createdFolderId);
    const res = await request(baseUrl).get(`/api/folders/slug/${folder.slug}`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.slug, folder.slug);
  });

  it('POST /api/folders/:id/move-documents handles empty array gracefully (400)', async () => {
    const res = await request(baseUrl)
      .post(`/api/folders/${createdFolderId}/move-documents`)
      .set('X-Dev-User-Id', devUser)
      .send({ documentIds: [] });
    assert.strictEqual(res.status, 400);
  });

  it('Nested folder delete without force should refuse (400)', async () => {
    // create child folder with unique name
    const childName = 'childFolder-' + Date.now();
    const createChild = await request(baseUrl).post('/api/folders').set('X-Dev-User-Id', devUser).send({ name: childName, parentId: createdFolderId });
    assert.strictEqual(createChild.status, 201);
    const childId = createChild.body.data._id;

    // attempt to delete parent without force
    const res = await request(baseUrl).delete(`/api/folders/${createdFolderId}`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 400);

    // cleanup: force delete parent which removes child
    const del = await request(baseUrl).delete(`/api/folders/${createdFolderId}?force=true`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(del.status, 200);
  });

});
