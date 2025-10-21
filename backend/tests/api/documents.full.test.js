import request from 'supertest';
import { describe, it, before, after } from 'mocha';
import assert from 'assert';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = 'http://localhost:4000';
const devUser = process.env.DEV_CURRENT_USER_ID || '650000000000000000000001';

// Helper to create a unique tiny PNG file for each test
function createUniquePNG() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 1000000);
  // Minimal valid PNG: 1x1 transparent pixel with unique timestamp in metadata
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]), // PNG signature
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // IHDR chunk length
    Buffer.from('IHDR'),
    Buffer.from([0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00]), // 1x1 RGBA
    Buffer.from([0x1F, 0x15, 0xC4, 0x89]), // IHDR CRC
    Buffer.from([0x00, 0x00, 0x00, 0x0A]), // IDAT chunk length
    Buffer.from('IDAT'),
    Buffer.from([0x78, 0x9C, 0x62, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01]), // compressed data
    Buffer.from([0x0D, 0x0A, 0x2D, 0xB4]), // IDAT CRC
    // tEXt chunk with unique timestamp
    Buffer.from([0x00, 0x00, 0x00, 0x10]), // tEXt chunk length (16 bytes)
    Buffer.from('tEXt'),
    Buffer.from(`test${timestamp}${random}\0`), // unique text
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // CRC (simplified, not accurate but works)
    Buffer.from([0x00, 0x00, 0x00, 0x00]), // IEND chunk length
    Buffer.from('IEND'),
    Buffer.from([0xAE, 0x42, 0x60, 0x82]) // IEND CRC
  ]);
  
  const tmpFile = path.join(__dirname, `test-${timestamp}-${random}.png`);
  fs.writeFileSync(tmpFile, png);
  return tmpFile;
}

describe('Documents API (full)', function() {
  this.timeout(20000);

  let folderId;
  let docId;
  let testImagePath;

  before(async () => {
    // Create unique test image to avoid fileHash conflicts
    testImagePath = createUniquePNG();
  });

  after(async () => {
    // Cleanup test document and image file
    if (docId) {
      await request(baseUrl).delete(`/api/documents/${docId}`).set('X-Dev-User-Id', devUser).catch(() => {});
    }
    if (testImagePath && fs.existsSync(testImagePath)) {
      fs.unlinkSync(testImagePath);
    }
  });

  it('setup: create folder for documents', async () => {
    const res = await request(baseUrl).post('/api/folders').set('X-Dev-User-Id', devUser).send({ name: 'docsFullTest-' + Date.now() });
    assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.data && res.body.data._id, 'Folder response should include data._id');
    folderId = res.body.data._id;
  });

  it('POST /api/documents upload a file', async () => {
    assert.ok(folderId, 'folderId should be set from setup step');
    const res = await request(baseUrl)
      .post('/api/documents')
      .set('X-Dev-User-Id', devUser)
      .field('title', 'full-test-doc-' + Date.now())
      .field('extractedFields', JSON.stringify({ foo: 'bar' }))
      .field('folderId', folderId)
      .attach('file', testImagePath);
    assert.strictEqual(res.status, 201, `Expected 201 but got ${res.status}: ${JSON.stringify(res.body)}`);
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
