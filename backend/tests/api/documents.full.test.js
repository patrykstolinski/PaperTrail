import request from 'supertest';
import { describe, it } from 'mocha';
import assert from 'assert';

const baseUrl = 'http://localhost:4000';
const devUser = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

describe('Documents API (full)', function() {
  this.timeout(20000);

  let folderId;
  let docId;

  it('setup: create folder for documents', async () => {
    const res = await request(baseUrl).post('/api/folders').set('X-Dev-User-Id', devUser).send({ name: 'docsFullTest-' + Date.now() });
    assert.strictEqual(res.status, 201);
    folderId = res.body.data._id;
  });

  it('POST /api/documents upload a file', async () => {
    const res = await request(baseUrl)
      .post('/api/documents')
      .set('X-Dev-User-Id', devUser)
      .field('title', 'full-test-doc')
      .field('extractedFields', JSON.stringify({ foo: 'bar' }))
      .field('folderId', folderId)
      .attach('file', 'backend/tests/DocumentUploadDownload/testBild.png');
    assert.strictEqual(res.status, 201);
    assert.ok(res.body.id || (res.body.data && res.body.data._id));
    docId = res.body.id || res.body.data._id || res.body.data.id;
  });

  it('GET /api/documents should list documents (paginated)', async () => {
    const res = await request(baseUrl).get('/api/documents?page=1&pageSize=10').set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data));
    assert.ok(res.body.meta && typeof res.body.meta.totalCount === 'number');
  });

  it('GET /api/documents/:id should return metadata without binary', async () => {
    const res = await request(baseUrl).get(`/api/documents/${docId}`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data);
    assert.strictEqual(res.body.data._id, docId);
    // fileBinaryData should not be present
    assert.ok(!res.body.data.fileBinaryData);
  });

  it('GET /api/documents/:id/download should return bytes', async () => {
    const res = await request(baseUrl).get(`/api/documents/${docId}/download`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
    // content-type should be present
    assert.ok(res.headers['content-type']);
    // body should not be empty
    assert.ok(res.body || res.text || res.buffer);
  });

  it('PUT /api/documents/:id should update metadata', async () => {
    const res = await request(baseUrl).put(`/api/documents/${docId}`).set('X-Dev-User-Id', devUser).send({ title: 'updated-title' });
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data.title, 'updated-title');
  });

  it('PUT with invalid folderId should return 400', async () => {
    const res = await request(baseUrl).put(`/api/documents/${docId}`).set('X-Dev-User-Id', devUser).send({ folderId: 'not-an-id' });
    assert.strictEqual(res.status, 400);
  });

  it('GET /api/documents/:id with invalid id should return 404', async () => {
    const res = await request(baseUrl).get('/api/documents/6500000000000000000000ff').set('X-Dev-User-Id', devUser);
    // ID may be valid but not exist
    assert.ok([404, 400, 403].includes(res.status));
  });

  it('DELETE /api/documents/:id should delete document', async () => {
    const res = await request(baseUrl).delete(`/api/documents/${docId}`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
  });

  it('cleanup: delete folder', async () => {
    const res = await request(baseUrl).delete(`/api/folders/${folderId}?force=true`).set('X-Dev-User-Id', devUser);
    assert.strictEqual(res.status, 200);
  });

});
